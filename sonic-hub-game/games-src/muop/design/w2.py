from lib import Lvl, arc

# ───────────────── Level 5 — Hẻm Đá Đỏ (claws: wall slide + wall jump) ─────────────────
def chimney_wall(L, x0, x1, top, bottom):
    for x in range(x0, x1 + 1):
        for y in range(top, bottom + 1): L.put(x, y, '#')

def level5():
    L = Lvl(240, 30); gy = 27
    L.ground(0, 19, gy)
    L.put(3, gy - 1, 'P'); L.put(6, gy - 1, '~'); L.put(12, gy - 1, 'W')
    # tutorial chimney: walk in under the left wall, climb out the top
    chimney_wall(L, 20, 20, gy - 9, gy - 3); L.ground(20, 23, gy)
    L.ground(24, 44, gy - 9)
    L.put(22, gy - 1, '~')
    L.col(22, gy - 8, gy - 4, 'o')
    L.put(30, gy - 10, 'e'); L.put(38, gy - 10, 'g')
    # second chimney: hanging pillar + cliff face
    chimney_wall(L, 44, 45, gy - 17, gy - 12); L.ground(44, 48, gy - 9)
    L.ground(49, 60, gy - 15)
    L.col(47, gy - 16, gy - 12, 'o')
    L.put(55, gy - 16, 'e'); L.put(52, gy - 16, '~')
    # star 1: an optional chimney above the path
    L.ground(61, 72, gy - 15)
    chimney_wall(L, 61, 62, gy - 25, gy - 18); chimney_wall(L, 66, 67, gy - 25, gy - 18); L.row(61, 67, gy - 26, '#')
    L.put(64, gy - 24, '*'); L.col(64, gy - 22, gy - 19, 'o')
    # descent shaft: slide down, leave at the bottom
    L.ground(73, 74, gy - 14); L.ground(75, 77, gy)
    L.ground(78, 80, gy - 18); L.carve(78, gy - 2, 80, gy - 1)
    L.col(76, gy - 12, gy - 4, 'o')
    L.ground(81, 100, gy)
    L.put(84, gy - 1, 'F')
    L.put(90, gy - 1, 'e'); L.put(97, gy - 1, 'g')
    # spike canyon: hop the broken columns
    L.ground(101, 123, gy); L.row(101, 123, gy - 1, '^')
    L.ground(104, 105, gy - 3); L.ground(110, 111, gy - 6); L.ground(116, 117, gy - 8)
    arc(L, 100, 105, gy - 6, 2); arc(L, 105, 111, gy - 9, 2); arc(L, 111, 117, gy - 11, 2)
    L.ground(124, 146, gy - 4)
    L.put(130, gy - 5, 'e'); L.put(138, gy - 5, 'g')
    # the fake wall at the foot of a block hides star 2
    L.ground(147, 152, gy - 8)
    L.put(147, gy - 5, 'H'); L.put(148, gy - 5, 'H'); L.put(149, gy - 5, '*')
    L.put(143, gy - 5, 'o'); L.put(145, gy - 5, 'o')
    L.ground(153, 170, gy - 8)
    L.put(158, gy - 9, 'F')
    # the big climb to the high road
    chimney_wall(L, 171, 172, gy - 20, gy - 11); L.ground(171, 175, gy - 8)
    L.ground(176, 239, gy - 20)
    L.col(174, gy - 19, gy - 10, 'o')
    L.put(182, gy - 21, 'g')
    # star 3: at the bottom of a deep well in the high road — climb back out
    L.carve(196, gy - 20, 198, gy - 8)
    L.put(197, gy - 9, '*'); L.col(197, gy - 18, gy - 11, 'o')
    L.put(210, gy - 21, 'e'); L.put(220, gy - 21, 'e')
    L.put(214, gy - 25, '?'); L.put(216, gy - 25, '+')
    L.put(232, gy - 21, 'G')
    return dict(id=5, name='Hẻm Đá Đỏ', theme='desert', grid=L, ability='wall', signs=[
        'Có gì đó lấp lánh phía trước.',
        'Nhảy vào tường, giữ hướng để bám, rồi nhấn nhảy để bật sang vách bên kia.',
        'Giữ hướng về phía tường để trượt xuống thật chậm.'])

# ───────────────── Level 6 — Biển Cát (lifts over sand, vultures, dunes) ─────────────────
def level6():
    L = Lvl(260, 26); gy = 23
    def dune(x0, x1, base, amp):
        import math
        for x in range(x0, x1 + 1):
            u = (x - x0) / max(1, x1 - x0)
            L.ground(x, x, gy - base - round(amp * math.sin(u * math.pi)))
    dune(0, 30, 0, 2)
    L.put(3, gy - 1, 'P'); L.put(7, gy - 1, '~')
    L.put(20, gy - 5, 'y')
    arc(L, 10, 24, gy - 6, 2)
    # sand sea #1: horizontal lift
    L.put(32, gy - 2, 'm'); L.put(44, gy - 2, ':')
    L.put(38, gy - 8, 'y')
    dune(48, 70, 0, 3)
    L.put(56, gy - 4, 'g'); L.put(64, gy - 3, 'f')
    L.put(60, gy - 8, '?')
    # mesa with a vertical lift: star 1 on top
    L.ground(71, 80, gy - 3)
    L.put(74, gy - 4, 'n'); L.put(74, gy - 15, ':')
    L.ground(81, 88, gy - 14, gy - 12)
    L.put(86, gy - 15, '*'); L.row(82, 85, gy - 16, 'o')
    L.ground(81, 100, gy - 3)
    L.put(92, gy - 4, 'F')
    L.put(97, gy - 9, 'y')
    # springs over a sand pit onto a floating dune
    L.put(100, gy - 4, 's')
    L.ground(106, 118, gy - 9, gy - 8)
    L.put(112, gy - 10, 'e')
    arc(L, 101, 106, gy - 13, 2)
    L.ground(123, 128, gy - 3)
    L.put(125, gy - 4, 'f')
    L.put(129, gy - 4, 'm'); L.put(140, gy - 4, ':')
    L.put(134, gy - 10, 'y')
    dune(144, 170, 1, 3)
    L.put(150, gy - 5, 'g'); L.put(160, gy - 5, 'e')
    L.put(154, gy - 9, '?'); L.put(156, gy - 9, '?')
    # star 2: fake dune wall
    L.ground(171, 176, gy - 7)
    L.put(171, gy - 2, 'H'); L.put(172, gy - 2, 'H'); L.put(173, gy - 2, '*')
    L.ground(171, 176, gy - 1)
    L.put(168, gy - 3, 'o')
    L.ground(177, 188, gy - 4)
    L.put(182, gy - 5, 'F')
    # vertical lifts ladder
    L.put(190, gy - 4, 'n'); L.put(190, gy - 12, ':')
    L.ground(194, 198, gy - 14, gy - 13)
    L.put(200, gy - 13, 'n'); L.put(200, gy - 5, ':')
    L.put(196, gy - 18, 'y')
    # star 3: wall jump up the lonely pillar
    L.ground(206, 207, gy - 16, gy - 3)
    L.put(206, gy - 17, '*')
    L.ground(204, 240, gy - 2)
    L.put(212, gy - 3, 'f'); L.put(222, gy - 3, 'g'); L.put(230, gy - 3, 'e')
    arc(L, 214, 228, gy - 7, 2)
    L.ground(241, 259, gy - 4)
    L.put(252, gy - 5, 'G')
    return dict(id=6, name='Biển Cát', theme='desert', grid=L, signs=[
        'Kền kền lao xuống khi thấy Mướp bên dưới. Giẫm lên lưng nó được.'])

# ───────────────── Level 7 — Phế Tích (turrets, crumbles, pillars, breakables) ─────────────────
def level7():
    L = Lvl(250, 28); gy = 25
    L.ground(0, 24, gy)
    L.put(3, gy - 1, 'P'); L.put(6, gy - 1, '~')
    L.rect(14, gy - 4, 15, gy - 1, '%'); L.put(15, gy - 5, 'r')
    L.put(20, gy - 1, 'e')
    # broken colonnade over spikes
    L.row(25, 50, gy, '^'); L.ground(25, 50, gy + 1)
    for x, h in [(27, 3), (32, 5), (37, 4), (42, 6), (47, 3)]:
        L.rect(x, gy - h, x + 1, gy, '%')
    L.row(29, 30, gy - 8, 'C'); L.row(39, 40, gy - 9, 'C')
    arc(L, 27, 48, gy - 11, 3)
    L.ground(51, 70, gy)
    L.put(61, gy - 1, 'g')
    # star 1: head-bump the cracked blocks to open a ceiling nook
    L.rect(54, gy - 8, 59, gy - 4, '%'); L.carve(55, gy - 7, 58, gy - 5); L.row(55, 58, gy - 4, 'X')
    L.put(56, gy - 6, '*'); L.put(55, gy - 6, 'o'); L.put(58, gy - 6, 'o')
    L.rect(66, gy - 4, 70, gy - 1, '%'); L.put(66, gy - 5, 'r')
    L.ground(71, 90, gy - 6)
    L.put(74, gy - 7, 'F'); L.put(84, gy - 7, 'e')
    # turret gallery: crumbling steps in a crossfire
    L.rect(91, gy - 8, 92, gy - 7, '%'); L.put(92, gy - 9, 'R')
    L.ground(93, 112, gy); L.row(94, 110, gy - 1, '^')
    L.row(93, 95, gy - 6, 'C'); L.row(98, 100, gy - 8, 'C'); L.row(103, 105, gy - 10, 'C'); L.row(108, 110, gy - 8, 'C')
    L.rect(111, gy - 12, 112, gy - 1, '%'); L.put(111, gy - 13, 'r')
    arc(L, 93, 110, gy - 13, 3)
    # climb between ruined towers
    L.ground(113, 134, gy)
    L.rect(116, gy - 14, 117, gy - 1, '%'); L.rect(121, gy - 18, 122, gy - 5, '%')
    L.put(114, gy - 1, 'g')
    L.col(119, gy - 16, gy - 8, 'o')
    L.ground(123, 134, gy - 18, gy - 16)
    L.put(127, gy - 19, 'e'); L.put(131, gy - 19, 'F')
    # high bridge of crumbles; a turret in the far wall fires along it
    L.row(135, 150, gy - 18, 'C')
    L.rect(151, gy - 21, 153, gy - 18, '%'); L.put(151, gy - 19, 'r')
    L.row(137, 149, gy - 21, 'o', step=3)
    L.ground(154, 175, gy - 17, gy - 15)
    L.put(160, gy - 18, 'g'); L.put(168, gy - 18, 'e')
    # descend past a ruin face; star 2 clings to it
    L.rect(176, gy - 17, 177, gy - 1, '%')
    L.put(178, gy - 9, '*')
    L.ground(176, 200, gy); L.row(178, 186, gy - 1, '^')
    L.row(181, 183, gy - 12, '%'); L.row(186, 188, gy - 8, '%')
    L.ground(187, 200, gy - 3)
    L.put(194, gy - 4, 'f')
    # climb beside a ruin block; star 3 sits above a cracked ceiling
    chimney_wall(L, 197, 198, gy - 14, gy - 6)
    L.rect(201, gy - 12, 204, gy - 5, '%'); L.carve(202, gy - 7, 203, gy - 6); L.row(202, 203, gy - 5, 'X')
    L.put(202, gy - 6, '*')
    L.ground(201, 204, gy - 3)
    L.col(199, gy - 12, gy - 6, 'o')
    L.ground(205, 249, gy - 12)
    L.put(214, gy - 13, 'e'); L.put(224, gy - 13, 'g')
    L.rect(230, gy - 15, 231, gy - 13, '%'); L.put(231, gy - 16, 'R')
    L.put(242, gy - 13, 'G')
    return dict(id=7, name='Phế Tích', theme='desert', grid=L, signs=[
        'Tượng đá phun lửa khi Mướp đứng trước mặt. Canh nhịp mà đi.'])

# ───────────────── Level 8 — Đền Mặt Trời (maze: sun/moon switches + keys) ─────────────────
def level8():
    W, H = 56, 40
    L = Lvl(W, H, '#')
    # ── bottom hall: sun gate, moon bridge over spikes, moon gate ──
    L.carve(1, 33, 54, 37)
    L.put(2, 37, 's'); L.put(5, 37, 'P'); L.put(8, 37, '~')
    L.put(11, 33, 'T')
    L.col(14, 33, 37, 'a')
    L.row(19, 28, 37, '^'); L.row(18, 29, 35, 'b')
    L.row(19, 27, 33, 'o', step=2)
    L.put(31, 33, 'T')
    L.col(34, 33, 37, 'b')
    L.put(37, 37, '~'); L.put(16, 37, 'L'); L.put(32, 37, 'L'); L.put(44, 37, 'L'); L.put(53, 37, 'L')
    L.put(41, 37, 'e'); L.put(47, 37, 'g')
    L.row(38, 48, 35, 'o', step=2)
    L.put(51, 37, 's'); L.carve(50, 32, 52, 32); L.put(45, 37, 'F')
    # ── left wing: a chimney whose right wall only exists at night (moon) ──
    L.carve(1, 32, 3, 32); L.carve(1, 14, 3, 31); L.carve(5, 16, 9, 31)
    L.col(4, 16, 30, 'b'); L.row(4, 9, 31, '=')
    L.col(2, 18, 28, 'o')
    L.carve(1, 9, 12, 13)
    L.put(11, 13, 'j'); L.put(7, 13, 'L'); L.put(2, 10, '*')
    L.put(8, 31, 'o')
    # ── right wing: land on the switch to reshape the stairs ──
    L.carve(42, 12, 54, 31)
    L.row(49, 53, 31, '=')
    L.put(44, 28, 'T'); L.row(45, 48, 28, '=')
    L.row(49, 53, 25, 'b'); L.row(44, 48, 22, '='); L.row(49, 53, 19, 'b'); L.row(44, 48, 16, '='); L.row(49, 53, 13, '=')
    L.row(47, 50, 11, 'J')
    L.ground(42, 43, 18, 18); L.put(42, 17, '*')
    L.put(51, 22, 'L'); L.put(46, 15, 'L')
    L.put(46, 21, 'o'); L.put(51, 18, 'o'); L.put(46, 27, 'o'); L.put(51, 24, 'o')
    # ── top: gold key room, gold door, lantern hall ──
    L.carve(42, 6, 54, 10)
    L.put(53, 10, 'k'); L.put(44, 10, 'L')
    L.col(41, 7, 10, 'K')
    L.carve(18, 5, 40, 10)
    L.put(24, 10, 'G'); L.put(20, 10, 'L'); L.put(30, 10, 'L'); L.put(38, 10, 'L')
    L.row(27, 37, 8, 'o', step=2)
    L.col(17, 7, 10, 'H'); L.carve(14, 7, 16, 10); L.put(15, 10, '*')
    return dict(id=8, name='Đền Mặt Trời', theme='temple', grid=L, maze=True, signs=[
        'Nút mặt trời đổi chỗ khối vàng và khối xanh. Húc từ dưới hoặc giẫm lên để bật.',
        'Kẹt thì mở bản đồ bằng M. Khối nào đang đặc sẽ hiện màu đậm.'])
