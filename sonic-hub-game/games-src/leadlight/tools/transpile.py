#!/usr/bin/env python3
"""Turns the original game's decompiled C# card scripts into JavaScript classes for the Leadlight engine.

    python3 transpile.py <Assembly-CSharp folder> <names.json> <out.js>

names.json lists the script class names to convert. The output keeps the C# member names (PascalCase), because the
engine core mirrors the original API one to one: that is what lets every card keep its exact behaviour.
Only the constructs the card scripts actually use are handled; anything else raises, so nothing is silently wrong.
"""
import json, os, re, sys

TOKEN_RE = re.compile(r'''
 (?P<ws>\s+)
|(?P<comment>//[^\n]*|/\*.*?\*/)
|(?P<str>@?"(?:[^"\\]|\\.)*")
|(?P<chr>'(?:[^'\\]|\\.)')
|(?P<num>0x[0-9a-fA-F]+|\d+\.\d*(?:[eE][+-]?\d+)?[fFdDmM]?|\.\d+[fFdDmM]?|\d+(?:[eE][+-]?\d+)?[fFdDmMlLuU]*)
|(?P<id>[A-Za-z_]\w*)
|(?P<op>\?\?=|\?\?|\?\.|=>|<<=|>>=|\+\+|--|&&|\|\||==|!=|<=|>=|\+=|-=|\*=|/=|%=|&=|\|=|\^=|<<|[{}()\[\];,.:?~!%^&*+\-=/<>|])
''', re.S | re.X)

class Tok:
    __slots__ = ('k', 'v')
    def __init__(self, k, v): self.k, self.v = k, v
    def __repr__(self): return f'{self.k}:{self.v}'

def tokenize(src):
    out, i = [], 0
    while i < len(src):
        m = TOKEN_RE.match(src, i)
        if not m: raise SyntaxError(f'cannot tokenize at {src[i:i+40]!r}')
        k = m.lastgroup; v = m.group(k); i = m.end()
        if k in ('ws', 'comment'): continue
        out.append(Tok(k, v))
    return out

KEYWORDS = {'return', 'new', 'throw', 'else', 'case', 'goto', 'yield', 'await', 'using', 'if', 'for', 'foreach', 'while',
            'do', 'switch', 'break', 'continue', 'default', 'try', 'catch', 'finally', 'true', 'false', 'null', 'this',
            'base', 'typeof', 'is', 'as', 'in', 'out', 'ref', 'params', 'checked', 'unchecked', 'lock', 'const'}
VALUE_TYPES = {'int', 'float', 'double', 'long', 'short', 'byte', 'bool', 'string', 'object', 'var', 'uint', 'decimal', 'char'}
CAST_TYPES = VALUE_TYPES | {'CardType', 'LandscapeType', 'Faction', 'PlayerType', 'CreatureScript', 'BuildingScript',
                            'SpellScript', 'CardScript', 'LeaderScript', 'Lane', 'CardItem', 'Quality', 'SelectionType',
                            'CardForm', 'LeaderItem'}
INT_CASTS = {'int', 'long', 'short', 'uint'}
PT_NAMES = {'Owner', 'player', 'Player', 'owner', 'Opponent', 'User', 'victim', 'thief', 'side', 'SelectionSide'}
DEFAULTS = {'int': '0', 'float': '0', 'double': '0', 'long': '0', 'short': '0', 'bool': 'false', 'uint': '0'}

def find_close(toks, i, o, c):
    """index of the token closing toks[i] (which is o)"""
    d = 0
    for j in range(i, len(toks)):
        if toks[j].v == o and toks[j].k == 'op': d += 1
        elif toks[j].v == c and toks[j].k == 'op':
            d -= 1
            if d == 0: return j
    raise SyntaxError('unbalanced ' + o)

def parse_type(toks, i):
    """if a type starts at i, return the index after it, else None. A type: id(.id)* [<...>] ([] | [,])* [?]"""
    if i >= len(toks) or toks[i].k != 'id' or toks[i].v in KEYWORDS: return None
    j = i + 1
    while j + 1 < len(toks) and toks[j].v == '.' and toks[j + 1].k == 'id': j += 2
    if j < len(toks) and toks[j].v == '<':
        d = 0
        for k in range(j, len(toks)):
            if toks[k].v == '<': d += 1
            elif toks[k].v == '>':
                d -= 1
                if d == 0: j = k + 1; break
            elif toks[k].v in ('(', ')', ';', '{', '}', '=', '&&', '||'): return None
        else: return None
    while j + 1 < len(toks) and toks[j].v == '[' and toks[j + 1].v in (']', ','):
        k = j + 1
        while toks[k].v == ',': k += 1
        if toks[k].v != ']': break
        j = k + 1
    if j < len(toks) and toks[j].v == '?' and j + 1 < len(toks) and (toks[j + 1].k == 'id' or toks[j + 1].v == ')'): j += 1
    return j

# ---------------------------------------------------------------- class parsing

class Member:
    def __init__(self, kind, name, static=False, params=None, body=None, rtype=None, init=None, getset=None):
        self.kind, self.name, self.static = kind, name, static
        self.params, self.body, self.rtype, self.init, self.getset = params, body, rtype, init, getset

MODS = {'public', 'private', 'protected', 'internal', 'static', 'override', 'virtual', 'new', 'abstract', 'sealed',
        'readonly', 'extern', 'unsafe', 'partial'}

def parse_class(src):
    toks = tokenize(src)
    i = 0
    while not (toks[i].k == 'id' and toks[i].v in ('class', 'struct')): i += 1
    name = toks[i + 1].v; i += 2
    base = None
    if toks[i].v == ':':
        base = toks[i + 1].v; i += 2
        while toks[i].v != '{': i += 1
    body_open = i; body_close = find_close(toks, i, '{', '}')
    members, i = [], body_open + 1
    while i < body_close:
        mods = set()
        while toks[i].k == 'id' and toks[i].v in MODS: mods.add(toks[i].v); i += 1
        static = 'static' in mods
        if toks[i].v == name and toks[i + 1].v == '(':          # constructor
            pc = find_close(toks, i + 1, '(', ')')
            params = toks[i + 2:pc]; j = pc + 1
            if toks[j].v == ':':                                  # : base(...)
                while toks[j].v != '{': j += 1
            bc = find_close(toks, j, '{', '}')
            members.append(Member('ctor', name, static, params, toks[j + 1:bc])); i = bc + 1; continue
        t_end = parse_type(toks, i)
        if t_end is None: raise SyntaxError(f'{name}: cannot read member at {toks[i:i+6]}')
        rtype = ' '.join(t.v for t in toks[i:t_end]); j = t_end
        mname = toks[j].v; j += 1
        if toks[j].v == '(':                                      # method
            pc = find_close(toks, j, '(', ')')
            params = toks[j + 1:pc]; k = pc + 1
            if toks[k].v == ';': members.append(Member('method', mname, static, params, None, rtype)); i = k + 1; continue
            bc = find_close(toks, k, '{', '}')
            members.append(Member('method', mname, static, params, toks[k + 1:bc], rtype)); i = bc + 1; continue
        if toks[j].v == '{':                                      # property
            bc = find_close(toks, j, '{', '}')
            inner = toks[j + 1:bc]; getset = {}
            k = 0
            while k < len(inner):
                while inner[k].k == 'id' and inner[k].v in MODS: k += 1
                acc = inner[k].v; k += 1
                if inner[k].v == ';': getset[acc] = None; k += 1
                else:
                    e = find_close(inner, k, '{', '}'); getset[acc] = inner[k + 1:e]; k = e + 1
            members.append(Member('prop', mname, static, rtype=rtype, getset=getset)); i = bc + 1; continue
        # field(s)
        k = j; depth = 0
        while not (toks[k].v == ';' and depth == 0):
            if toks[k].v in '({[': depth += 1
            elif toks[k].v in ')}]': depth -= 1
            k += 1
        init = toks[j + 1:k] if toks[j].v == '=' else None
        members.append(Member('field', mname, static, rtype=rtype, init=init)); i = k + 1
    return name, base, members

# ---------------------------------------------------------------- body conversion

class Ctx:
    def __init__(self, cls, hierarchy, static, params):
        self.cls, self.h, self.static = cls, hierarchy, static
        self.locals = set(params)

def params_js(ptoks):
    """(PlayerType player, Lane lane = null) -> ['player', 'lane = null'] and the names"""
    if not ptoks: return [], []
    parts, cur, d = [], [], 0
    for t in ptoks:
        if t.v in '(<[': d += 1
        elif t.v in ')>]': d -= 1
        if t.v == ',' and d == 0: parts.append(cur); cur = []
        else: cur.append(t)
    parts.append(cur)
    out, names = [], []
    for p in parts:
        p = [t for t in p if t.v not in ('ref', 'out', 'params', 'this')]
        e = parse_type(p, 0)
        nm = p[e].v; names.append(nm)
        if e + 1 < len(p) and p[e + 1].v == '=':
            out.append(nm + ' = ' + emit(p[e + 2:], None))
        else: out.append(nm)
    return out, names

def operand_end(toks, i):
    """index after the unary/postfix expression starting at i"""
    j = i
    while toks[j].v in ('!', '-', '+', '~') and toks[j].k == 'op': j += 1
    if toks[j].v == '(':
        j = find_close(toks, j, '(', ')') + 1
    elif toks[j].k in ('id', 'num', 'str', 'chr'):
        if toks[j].v == 'new':
            j += 1
            e = parse_type(toks, j); j = e
            if toks[j].v == '(': j = find_close(toks, j, '(', ')') + 1
        else: j += 1
    else: raise SyntaxError(f'operand at {toks[i:i+5]}')
    while j < len(toks):
        if toks[j].v in ('.', '?.') and toks[j + 1].k == 'id': j += 2
        elif toks[j].v == '(': j = find_close(toks, j, '(', ')') + 1
        elif toks[j].v == '[': j = find_close(toks, j, '[', ']') + 1
        elif toks[j].v in ('++', '--'): j += 1
        else: break
    return j

def is_cast(toks, i):
    """toks[i] == '(' : is it a cast like (int) x ?"""
    if toks[i].v != '(' or i + 2 >= len(toks): return None
    e = parse_type(toks, i + 1)
    if e is None or toks[e].v != ')': return None
    tname = toks[i + 1].v
    if tname not in CAST_TYPES: return None
    nxt = toks[e + 1] if e + 1 < len(toks) else None
    if nxt is None: return None
    if nxt.k in ('id', 'num', 'str', 'chr') or nxt.v in ('(', '!', '~'): return (tname, e + 1)
    if nxt.v == '-' and tname in INT_CASTS | {'float', 'double'}: return (tname, e + 1)
    return None

def emit(toks, ctx, stmt=False):
    """convert a token list to JS text"""
    out = []
    i, n = 0, len(toks)
    stmt_start = True
    prev_sig = None   # previous emitted significant token value
    while i < n:
        t = toks[i]
        # ---- declarations at statement start: TYPE NAME (= | ; | , | in)
        if stmt_start and t.k == 'id' and t.v not in KEYWORDS:
            e = parse_type(toks, i)
            if e is not None and e < n and toks[e].k == 'id' and toks[e].v not in KEYWORDS and e + 1 < n and toks[e + 1].v in ('=', ';', ','):
                if ctx: ctx.locals.add(toks[e].v)
                # also further declarators: int a = 1, b = 2;
                k = e + 1; d = 0
                while k < n and not (toks[k].v == ';' and d == 0):
                    if toks[k].v in '([{': d += 1
                    elif toks[k].v in ')]}': d -= 1
                    elif toks[k].v == ',' and d == 0 and k + 1 < n and toks[k + 1].k == 'id' and ctx: ctx.locals.add(toks[k + 1].v)
                    k += 1
                tname = toks[i].v
                out.append('let')
                # an uninitialised value-type local gets its default
                if toks[e + 1].v == ';' and tname in DEFAULTS:
                    out.append(toks[e].v + ' = ' + DEFAULTS[tname]); i = e + 1; stmt_start = False; prev_sig = 'x'; continue
                i = e; stmt_start = False; continue
        if t.k == 'id' and t.v == 'const' and stmt_start:
            i += 1; continue
        # ---- foreach (TYPE x in expr)
        if t.k == 'id' and t.v == 'foreach':
            j = i + 1
            assert toks[j].v == '('
            pc = find_close(toks, j, '(', ')')
            e = parse_type(toks, j + 1)
            var = toks[e].v
            assert toks[e + 1].v == 'in', toks[j:pc]
            if ctx: ctx.locals.add(var)
            out.append(f'for (const {var} of {emit(toks[e + 2:pc], ctx)})')
            i = pc + 1; stmt_start = True; continue
        # ---- for ( init ; ...)
        if t.k == 'id' and t.v == 'for' and toks[i + 1].v == '(':
            pc = find_close(toks, i + 1, '(', ')')
            inner = toks[i + 2:pc]
            # split by top level ';'
            parts, cur, d = [], [], 0
            for x in inner:
                if x.v in '([{': d += 1
                elif x.v in ')]}': d -= 1
                if x.v == ';' and d == 0: parts.append(cur); cur = []
                else: cur.append(x)
            parts.append(cur)
            init = emit(parts[0] + [Tok('op', ';')], ctx, True).rstrip(';').strip()
            out.append(f'for ({init}; {emit(parts[1], ctx)}; {emit(parts[2], ctx)})')
            i = pc + 1; stmt_start = True; continue
        # ---- catch (Exception e)
        if t.k == 'id' and t.v == 'catch' and toks[i + 1].v == '(':
            pc = find_close(toks, i + 1, '(', ')')
            inner = toks[i + 2:pc]
            var = inner[-1].v if len(inner) >= 2 else 'e'
            out.append(f'catch ({var})'); i = pc + 1; stmt_start = True; continue
        # ---- casts
        if t.v == '(' and t.k == 'op':
            c = is_cast(toks, i)
            if c:
                tname, start = c
                end = operand_end(toks, start)
                inner = emit(toks[start:end], ctx)
                if tname in INT_CASTS:
                    # an int cast of a parenthesised (or float) expression truncates; of a plain value it is a no-op
                    seg = toks[start:end]
                    fractional = any(x.v in ('*', '/') for x in seg) or any(x.k == 'num' and ('.' in x.v or x.v.endswith(('f', 'F'))) for x in seg) \
                        or any(seg[q].v == '(' and q + 2 < len(seg) and seg[q + 1].v in ('float', 'double') and seg[q + 2].v == ')' for q in range(len(seg)))
                    if fractional:
                        out.append(f'Math.trunc({inner})')
                    else:
                        out.append(f'({inner})' if any(x.v in ('+', '-', '?') for x in seg) and not (seg[0].v == '(' and find_close(seg, 0, '(', ')') == len(seg) - 1) else inner)
                elif tname == 'bool':
                    out.append(inner)
                else:
                    out.append(inner if toks[start].k != 'op' or toks[start].v == '(' else f'({inner})')
                i = end; stmt_start = False; prev_sig = 'x'; continue
        # ---- ! on a PlayerType value
        if t.v == '!' and t.k == 'op':
            j = i + 1
            if toks[j].v == '(' and is_cast(toks, j) and is_cast(toks, j)[0] == 'PlayerType':
                tn, st = is_cast(toks, j); end = operand_end(toks, st)
                out.append(f'opp({emit(toks[st:end], ctx)})'); i = end; stmt_start = False; prev_sig = 'x'; continue
            end = operand_end(toks, j)
            seg = toks[j:end]
            last = [x for x in seg if x.k == 'id']
            if seg and seg[-1].k == 'id' and seg[-1].v in PT_NAMES and not (end < n and toks[end].v == '('):
                out.append(f'opp({emit(seg, ctx)})'); i = end; stmt_start = False; prev_sig = 'x'; continue
            if seg and seg[0].v == '(' and len(seg) > 2 and seg[-1].v == ')':
                inner_ids = [x for x in seg[1:-1] if x.k == 'id']
                if inner_ids and inner_ids[-1].v in PT_NAMES and seg[-2].k == 'id' and all(x.k == 'id' or x.v == '.' for x in seg[1:-1]):
                    out.append(f'opp({emit(seg[1:-1], ctx)})'); i = end; stmt_start = False; prev_sig = 'x'; continue
        # ---- as / is
        if t.k == 'id' and t.v == 'as' and prev_sig is not None:
            e = parse_type(toks, i + 1); i = e; continue
        if t.k == 'id' and t.v == 'is' and prev_sig is not None:
            e = parse_type(toks, i + 1)
            out.append('instanceof ' + ' '.join(x.v for x in toks[i + 1:e])); i = e; continue
        # ---- new
        if t.k == 'id' and t.v == 'new':
            e = parse_type(toks, i + 1)
            tname = toks[i + 1].v
            if toks[e].v == '(':
                pc = find_close(toks, e, '(', ')')
                args = emit(toks[e + 1:pc], ctx)
                if tname == 'List':
                    out.append(f'Array.from({args})' if args else '[]')
                elif tname in ('CWList', 'WeightedList', 'StatMod', 'CardItem', 'AIDecision'):
                    out.append(f'new {tname}({args})')
                else:
                    out.append(f'new {tname}({args})')
                i = pc + 1; stmt_start = False; prev_sig = 'x'; continue
            if toks[e].v == '[':
                # new int[n] / new CardType[n]
                pc = find_close(toks, e, '[', ']')
                size = emit(toks[e + 1:pc], ctx)
                out.append(f'newArray({size}, {DEFAULTS.get(tname, "null")})'); i = pc + 1; stmt_start = False; prev_sig = 'x'; continue
            raise SyntaxError(f'new form at {toks[i:i+6]}')
        # ---- typeof(X)
        if t.k == 'id' and t.v == 'typeof':
            pc = find_close(toks, i + 1, '(', ')')
            out.append(' '.join(x.v for x in toks[i + 2:pc])); i = pc + 1; prev_sig = 'x'; continue
        # ---- base.X
        if t.k == 'id' and t.v == 'base' and toks[i + 1].v == '.':
            name = toks[i + 2].v
            if i + 3 < n and toks[i + 3].v == '(':
                out.append('super.' + name)
            else:
                out.append('this.' + name)
            i += 3; stmt_start = False; prev_sig = 'x'; continue
        # ---- 2D indexers X[a, b]
        if t.v == '[' and t.k == 'op' and prev_sig not in (None, 'op'):
            pc = find_close(toks, i, '[', ']')
            inner = toks[i + 1:pc]; parts, cur, d = [], [], 0
            for x in inner:
                if x.v in '([{': d += 1
                elif x.v in ')]}': d -= 1
                if x.v == ',' and d == 0: parts.append(cur); cur = []
                else: cur.append(x)
            parts.append(cur)
            out.append(''.join('[' + emit(p, ctx) + ']' for p in parts)); i = pc + 1; prev_sig = 'x'; stmt_start = False; continue
        # ---- identifiers: implicit this / statics / special names
        if t.k == 'id':
            v = t.v
            after_dot = prev_sig == '.'
            if not after_dot and ctx is not None and v not in KEYWORDS and v not in ctx.locals:
                owner = ctx.h.owner(v)
                if owner is not None:
                    cls, static = owner
                    out.append((cls if static else 'this') + '.' + v)
                    i += 1; stmt_start = False; prev_sig = 'x'; continue
            if not after_dot and v == 'int' and toks[i + 1].v == '.':
                fld = toks[i + 2].v
                out.append({'MaxValue': '2147483647', 'MinValue': '(-2147483648)'}[fld]); i += 3; prev_sig = 'x'; continue
            if not after_dot and v == 'string' and toks[i + 1].v == '.' and toks[i + 2].v == 'Empty':
                out.append("''"); i += 3; prev_sig = 'x'; continue
            if not after_dot and v == 'KFFLocalization' and toks[i + 2].v == 'Get':
                out.append('L10N'); i += 3; prev_sig = 'x'; continue
            if not after_dot and v == 'UnityEngine' and toks[i + 1].v == '.':
                i += 2; continue   # UnityEngine.Random -> Random, UnityEngine.Debug -> Debug
            if v == 'Range' and after_dot and out and out[-1] == '.' and len(out) > 1 and out[-2].endswith('Random'):
                # Random.Range with float literals is the inclusive float version
                pc = find_close(toks, i + 1, '(', ')')
                fl = any(x.k == 'num' and (x.v.endswith(('f', 'F')) or '.' in x.v) for x in toks[i + 1:pc])
                out.append('RangeF' if fl else 'Range'); i += 1; prev_sig = 'x'; continue
            if v in ('true', 'false', 'null', 'this', 'return', 'new', 'typeof', 'else', 'break', 'continue', 'if', 'while', 'do', 'switch', 'case', 'default', 'throw'):
                out.append(v)
            else:
                out.append(v)
            i += 1; prev_sig = 'x' if v not in KEYWORDS else v; stmt_start = False; continue
        if t.k == 'num':
            v = t.v
            if not v.startswith('0x'): v = re.sub(r'[fFdDmMlLuU]+$', '', v)
            if v.endswith('.'): v = v[:-1]
            out.append(v); i += 1; prev_sig = 'x'; stmt_start = False; continue
        if t.k == 'str':
            out.append(t.v.lstrip('@')); i += 1; prev_sig = 'x'; stmt_start = False; continue
        if t.k == 'chr':
            out.append('"' + t.v[1:-1] + '"'); i += 1; prev_sig = 'x'; stmt_start = False; continue
        # operators
        v = t.v
        out.append(v)
        stmt_start = v in ('{', '}', ';') or (v == ')' and False)
        if v == ':' and out and len(out) > 1: pass
        prev_sig = '.' if v == '.' else ('op' if v not in (')', ']') else 'x')
        if v in ('{', '}', ';', ':'): stmt_start = True
        i += 1
    return join_tokens(out)

def join_tokens(parts):
    s = ''
    for p in parts:
        if not s: s = p; continue
        a, b = s[-1], p[0]
        if p in ('.', ',', ';', ')', ']', '?.', '++', '--') or a in ('(', '[', '.') or (a == '!' and s[-2:] != '!='):
            if p in ('++', '--') and a == ' ': s = s.rstrip()
            s += p
        elif p[0] in ('(', '[') and (a.isalnum() or a in ('_', ')', ']')) and not s.endswith((' return', ' new', ' in', ' of', ' else', ' typeof')):
            s += p
        elif p == '{' or p == '}':
            s += ' ' + p
        else:
            s += ' ' + p
    return s

def fmt_body(code):
    """indent a JS body for reading"""
    out, d = [], 0
    code = code.replace('{ ', '{\n').replace('; ', ';\n').replace('} ', '}\n')
    for line in code.split('\n'):
        line = line.strip()
        if not line: continue
        if line.startswith('}'): d -= 1
        out.append('    ' * max(d, 0) + line)
        if line.endswith('{'): d += 1
    return '\n'.join(out)

# ---------------------------------------------------------------- hierarchy

class Hierarchy:
    def __init__(self, classes, cls):
        self.chain = []
        c = cls
        while c in classes:
            self.chain.append(c); c = classes[c]['base']
        self.classes = classes
    def owner(self, name):
        for c in self.chain:
            m = self.classes[c]['members'].get(name)
            if m is not None: return (c, m)
        return None

def build_member_table(members):
    t = {}
    for m in members:
        if m.kind == 'ctor': continue
        t[m.name] = m.static
    return t

def convert(cls, base, members, classes):
    h = Hierarchy(classes, cls)
    lines = [f'class {cls} extends {base} {{']
    for m in members:
        if m.kind == 'field':
            init = emit(m.init, Ctx(cls, h, m.static, [])) if m.init else DEFAULTS.get(m.rtype, 'null')
            lines.append(f'  {"static " if m.static else ""}{m.name} = {init};')
    for m in members:
        if m.kind == 'prop':
            if m.getset.get('get') is None and m.getset.get('set') is None and 'get' in m.getset:
                lines.append(f'  {"static " if m.static else ""}{m.name} = {DEFAULTS.get(m.rtype, "null")};'); continue
            for acc, body in m.getset.items():
                ctx = Ctx(cls, h, m.static, ['value'] if acc == 'set' else [])
                code = emit(body, ctx, True)
                if acc == 'get': lines.append(f'  {"static " if m.static else ""}get {m.name}() {{\n{indent(fmt_body(code), 4)}\n  }}')
                else: lines.append(f'  {"static " if m.static else ""}set {m.name}(value) {{\n{indent(fmt_body(code), 4)}\n  }}')
        elif m.kind in ('method', 'ctor'):
            if m.body is None: continue
            pj, names = params_js(m.params)
            ctx = Ctx(cls, h, m.static, names)
            code = emit(m.body, ctx, True)
            if m.kind == 'ctor':
                lines.append(f'  constructor() {{\n    super();\n{indent(fmt_body(code), 4)}\n  }}')
            else:
                lines.append(f'  {"static " if m.static else ""}{m.name}({", ".join(pj)}) {{\n{indent(fmt_body(code), 4)}\n  }}')
    lines.append('}')
    return '\n'.join(lines)

def indent(s, k): return '\n'.join(' ' * k + l for l in s.split('\n'))

# C# divides ints by truncating. The card scripts divide in exactly these places; each is named here as integer or
# float division, and any division not named stops the build, so a new one cannot slip through as the wrong kind.
INT_DIVISIONS = [
    (r'return num / num2;', 'return IDIV(num, num2);'),
    (r'this\.GameInstance\.GetDiscardPile\(this\.Owner\)\.Count / this\.Data\.Form\.BaseVal2', 'IDIV(this.GameInstance.GetDiscardPile(this.Owner).Count, this.Data.Form.BaseVal2)'),
    (r'this\.Enemy\.ATK / 2', 'IDIV(this.Enemy.ATK, 2)'),
    (r'\bcreature\.DEF / 2', 'IDIV(creature.DEF, 2)'),
    (r'\bcreature2\.DEF / 2', 'IDIV(creature2.DEF, 2)'),
]
FLOAT_DIVISIONS = [r'this\.Data\.Val1 / 100\b']
def fix_divisions(text):
    for pat, rep in INT_DIVISIONS: text = re.sub(pat, rep, text)
    rest = text
    for pat in FLOAT_DIVISIONS: rest = re.sub(pat, '', rest)
    left = [l.strip() for l in rest.split('\n') if re.search(r'[^/*] / [^/*]', l)]
    if left: raise SystemExit('a division that is neither listed as integer nor as float:\n  ' + '\n  '.join(left))
    text = text.replace('Enum.GetValues(Faction)', 'Object.values(Faction)')
    # Nullable<T>.Value: the hero's forFaction / forCardType; throws on null, as in C#
    text = re.sub(r'\b([A-Za-z_][\w.]*?)\.Value\b', r'NV(\1)', text)
    # DoEffect(source, PlayerType) and DoEffect(source, int lane) are two overloads in C#; in JS both are numbers
    text = re.sub(r'\.DoEffect\(this, (this\.Owner|opp\(this\.Owner\))\)', r'.DoEffectHero(this, \1)', text)
    text = re.sub(r'\.DoEffect\(this, ([\w.]*\.Index)\)', r'.DoEffectLane(this, \1)', text)
    left = re.findall(r'CWFloopActionManager\.GetInstance\(\)\.DoEffect\([^)]*\)', text)
    left = [x for x in left if not x.endswith('.ToArray())') and 'ToArray' not in x]
    if left: raise SystemExit('a DoEffect whose overload is not known: ' + ', '.join(left))
    return text

def main():
    src_dir, names_file, out_file = sys.argv[1:4]
    names = json.load(open(names_file))
    if isinstance(names, dict): names = list(names.keys())
    bases = ['CardScript', 'CreatureScript', 'BuildingScript', 'SpellScript', 'LeaderScript']
    classes = {}
    for b in bases:
        cname, cbase, mem = parse_class(open(os.path.join(src_dir, b + '.cs'), encoding='utf-8-sig').read())
        classes[cname] = {'base': cbase, 'members': build_member_table(mem)}
    parsed = {}
    todo = list(names)
    while todo:   # a script may extend another one that no card names: that one comes too
        nm = todo.pop(0)
        if nm in parsed or nm in bases: continue
        cname, cbase, mem = parse_class(open(os.path.join(src_dir, nm + '.cs'), encoding='utf-8-sig').read())
        classes[cname] = {'base': cbase, 'members': build_member_table(mem)}
        parsed[cname] = (cbase, mem)
        if cbase not in classes and cbase not in todo: todo.append(cbase)
    # classes must be known before members are resolved: build every table first, then convert
    # bases first, then by dependency (a script may extend another script)
    order, seen = [], set()
    def visit(c):
        if c in seen or c not in parsed: return
        visit(parsed[c][0]); seen.add(c); order.append(c)
    for c in parsed: visit(c)
    out = ['/* Generated by tools/transpile.py from the original card scripts: do not edit by hand. */']
    errors = []
    for c in order:
        try: out.append(convert(c, parsed[c][0], parsed[c][1], classes))
        except Exception as e: errors.append(f'{c}: {e}')
    out.append('const SCRIPTS = { ' + ', '.join(order) + ' };')
    text = '\n\n'.join(out) + '\n'
    text = fix_divisions(text)
    open(out_file, 'w').write(text)
    print(f'{len(order) - len(errors)} converted, {len(errors)} failed')
    for e in errors: print('  ', e)

if __name__ == '__main__':
    main()
