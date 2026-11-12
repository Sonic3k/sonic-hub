class Lvl:
    def __init__(self, w, h, fill=' '):
        self.w, self.h = w, h
        self.g = [[fill] * w for _ in range(h)]
    def put(self, x, y, ch):
        if 0 <= x < self.w and 0 <= y < self.h: self.g[y][x] = ch
        else: raise ValueError(f'put out of bounds {x},{y} ({self.w}x{self.h})')
    def row(self, x0, x1, y, ch, step=1):
        for x in range(x0, x1 + 1, step): self.put(x, y, ch)
    def col(self, x, y0, y1, ch):
        for y in range(y0, y1 + 1): self.put(x, y, ch)
    def ground(self, x0, x1, top, bottom=None):
        b = self.h - 1 if bottom is None else bottom
        for x in range(x0, x1 + 1):
            for y in range(top, b + 1): self.put(x, y, '#')
    def rect(self, x0, y0, x1, y1, ch):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): self.put(x, y, ch)
    def carve(self, x0, y0, x1, y1): self.rect(x0, y0, x1, y1, ' ')
    def rows(self): return [''.join(r) for r in self.g]

def arc(L, x0, x1, ytop, depth, step=2):
    """fireflies along a gentle arch (a jump's shape) from x0 to x1"""
    n = x1 - x0
    for x in range(x0, x1 + 1, step):
        u = (x - x0) / n if n else 0.5
        y = round(ytop + depth * (2 * u - 1) ** 2)
        if L.g[y][x] == ' ': L.put(x, y, 'o')
