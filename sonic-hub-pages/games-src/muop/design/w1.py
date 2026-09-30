from lib import Lvl, arc

# ───────────────── Level 1 — Sáng Trên Đồi (tutorial) ─────────────────
def level1():
    L = Lvl(236, 20); gy = 17
    L.ground(0, 45, gy)
    L.put(3, gy - 1, 'P'); L.put(7, gy - 1, '~')
    arc(L, 11, 21, 12, 3)
    L.ground(30, 31, gy - 1)                      # small bump
    L.put(34, gy - 1, '~')
    L.ground(36, 44, gy - 2)                      # 2-high block
    L.row(38, 42, 13, 'o', step=2)
    arc(L, 45, 50, 13, 2)                         # over the first gap (46-48)
    L.ground(49, 122, gy)
    L.put(51, gy - 1, '~'); L.put(56, gy - 1, 'e')
    L.put(58, gy - 1, '~')
    L.put(60, 13, '?'); L.put(62, 13, '+'); L.put(64, 13, '?')
    L.put(70, gy - 1, 'e')
    L.row(73, 77, 15, 'o', step=2)
    L.put(79, gy - 1, '~'); L.put(83, gy - 1, 'F')
    L.row(88, 94, 14, 'o', step=3)
    # optional high path: one-way steps to star 1
    L.row(98, 100, 14, '='); L.row(101, 103, 11, '='); L.row(104, 106, 8, '=')
    L.put(99, 12, 'o'); L.put(102, 9, 'o'); L.put(105, 6, 'o'); L.put(108, 6, '*')
    L.put(112, gy - 1, 'e')
    arc(L, 121, 127, 13, 2)                       # gap 123-125
    L.ground(126, 158, gy)
    L.put(130, gy - 1, 'e'); L.put(137, gy - 1, 'e')
    # a wall with a secret nook at its foot (fireflies lead in)
    L.ground(142, 147, gy - 3)
    L.put(142, gy - 1, 'H'); L.put(143, gy - 1, 'H'); L.put(144, gy - 1, '*')
    L.put(136, gy - 1, 'o'); L.put(138, gy - 1, 'o'); L.put(140, gy - 1, 'o')
    L.row(143, 147, 12, 'o', step=2)
    L.put(152, 13, '?')
    # pit with a pillar; a floating block holds star 3
    L.ground(163, 164, gy - 2)
    L.row(164, 166, 11, '#'); L.put(165, 10, '*')
    arc(L, 158, 163, 13, 2); arc(L, 164, 169, 13, 2)
    L.ground(168, 235, gy)
    L.put(175, gy - 1, 'e'); L.put(186, gy - 1, 'e')
    L.put(180, 13, '?'); L.put(182, 13, '?')
    L.row(190, 198, 14, 'o', step=2)
    for i, x in enumerate(range(204, 212, 2)):   # stairs up to the lantern hill
        L.ground(x, x + 1, gy - 1 - i)
    L.ground(212, 235, gy - 4)
    L.row(214, 220, 10, 'o', step=2)
    L.put(226, gy - 5, 'G')
    return dict(id=1, name='Sáng Trên Đồi', theme='meadow', grid=L, signs=[
        'Mướp ơi, mười hai ngọn đèn đã tắt. Mang đốm lửa trên đuôi đi thắp lại nhé!',
        'Giữ nút nhảy lâu hơn thì nhảy cao hơn.',
        'Nhảy lên đầu bọ rùa để hạ nó.',
        'Húc hộp đèn từ bên dưới để lấy đom đóm.',
        'Đèn nhỏ là đèn lưu. Ngã thì quay lại đây.'])

# ───────────────── Level 2 — Rừng Tre (springs, one-ways, bees, frogs, lift) ─────────────────
def level2():
    L = Lvl(250, 22); gy = 19
    L.ground(0, 34, gy)
    L.put(3, gy - 1, 'P'); L.put(7, gy - 1, '~')
    L.put(14, gy - 1, 's')
    L.ground(18, 40, gy - 8, gy - 6)              # high ledge (floating slab), walkway under it
    L.row(19, 29, gy - 10, 'o', step=2)
    L.put(24, gy - 1, 'f')
    L.ground(35, 60, gy)
    L.put(40, gy - 1, 'f'); L.put(50, gy - 1, 'f')
    # upper path: bamboo one-ways to star 1
    L.row(42, 44, gy - 10, '='); L.row(47, 49, gy - 12, '='); L.row(52, 54, gy - 14, '=')
    L.put(53, gy - 16, '*'); L.put(48, gy - 14, 'o'); L.put(43, gy - 12, 'o')
    L.row(56, 59, gy - 11, '=')
    # long pit with a lift
    L.put(61, gy - 3, 'm'); L.put(71, gy - 3, ':')
    arc(L, 62, 74, gy - 7, 3)
    L.ground(75, 84, gy); L.put(79, gy - 1, '~')
    L.put(81, gy - 5, 'q')
    L.ground(88, 94, gy); L.put(91, gy - 5, 'q')
    L.ground(98, 106, gy); L.put(102, gy - 6, 'q')
    arc(L, 84, 88, gy - 5, 2); arc(L, 94, 98, gy - 5, 2)
    L.ground(107, 130, gy)
    L.put(112, gy - 1, 'F')
    L.put(118, gy - 5, '?'); L.put(120, gy - 5, '?')
    L.put(125, gy - 1, 'f')
    # bamboo scaffold climb
    L.row(131, 134, gy - 3, '='); L.row(136, 139, gy - 6, '='); L.row(131, 134, gy - 9, '=')
    L.row(136, 139, gy - 12, '='); L.row(141, 150, gy - 14, '=')
    L.ground(131, 150, gy)
    L.put(137, gy - 1, 'g')
    L.row(142, 150, gy - 16, 'o', step=2)
    L.put(149, gy - 17, '*')
    # spring hops over a pit on pillars
    L.ground(151, 153, gy)
    L.ground(158, 159, gy - 1); L.put(158, gy - 2, 's')
    L.ground(166, 167, gy - 1); L.put(166, gy - 2, 's')
    L.put(162, gy - 9, 'q')
    arc(L, 154, 158, gy - 6, 2); arc(L, 160, 166, gy - 10, 3)
    L.ground(172, 205, gy)
    L.put(178, gy - 1, 'f'); L.put(188, gy - 1, 'f')
    # star 3: a slab reachable only by the spring on its far side
    L.ground(192, 197, gy - 7, gy - 6)
    L.put(194, gy - 8, '*')
    L.put(199, gy - 1, 's')
    L.row(185, 191, gy - 5, 'o', step=2)
    L.ground(206, 249, gy - 2)
    L.put(214, gy - 3, 'f')
    L.put(220, gy - 7, '?')
    L.row(226, 236, gy - 6, 'o', step=2)
    L.put(242, gy - 3, 'G')
    return dict(id=2, name='Rừng Tre', theme='meadow', grid=L, signs=[
        'Lò xo đỏ bật rất cao. Giữ nút nhảy khi bật để bay xa hơn.',
        'Tấm ván trôi chở Mướp qua vực. Đứng yên trên ván là được.'])

# ───────────────── Level 3 — Thác Bạc (climb, crumbling ledges, spiky burrs, vertical lift) ─────────────────
def level3():
    L = Lvl(236, 34); gy = 31
    L.ground(0, 40, gy)
    L.put(3, gy - 1, 'P'); L.put(6, gy - 1, '~')
    L.put(14, gy - 1, 'g'); L.put(26, gy - 1, 'e')
    L.row(18, 24, gy - 5, 'o', step=2)
    L.put(30, gy - 5, '?')
    # crumbling bridge
    L.row(41, 48, gy, 'C')
    L.put(44, gy - 4, 'o')
    L.ground(49, 62, gy)
    L.put(52, gy - 1, '~')
    # the cliff: climb up the face with one-ways and crumbles
    L.ground(63, 80, gy - 16)
    L.row(58, 60, gy - 4, '='); L.row(54, 56, gy - 7, '='); L.row(58, 60, gy - 10, 'C'); L.row(54, 56, gy - 13, '=')
    L.row(59, 62, gy - 15, '=')
    L.put(55, gy - 9, 'o'); L.put(59, gy - 12, 'o'); L.put(55, gy - 15, 'o')
    L.put(50, gy - 15, '*')                     # star 1: leap left off the top one-way
    L.row(49, 51, gy - 14, 'C')
    L.put(68, gy - 17, 'F')
    L.put(76, gy - 17, 'g')
    # upper run with burrs and gaps
    L.ground(81, 84, gy - 16)
    L.ground(89, 100, gy - 15)
    L.put(95, gy - 16, 'g')
    arc(L, 84, 89, gy - 20, 2)
    L.ground(104, 108, gy - 17)
    L.ground(112, 126, gy - 15)
    L.put(117, gy - 16, 'e'); L.put(122, gy - 16, 'g')
    arc(L, 100, 104, gy - 20, 2); arc(L, 108, 112, gy - 21, 2)
    # vertical lift down into the gorge
    L.put(128, gy - 16, 'n'); L.put(128, gy - 4, ':')
    L.row(127, 131, gy - 20, 'o', step=2)
    L.ground(132, 150, gy)
    L.put(137, gy - 1, 'g'); L.put(145, gy - 1, 'e')
    L.put(134, gy - 1, 'F')
    # star 2: behind a fake wall at the gorge floor
    L.ground(151, 155, gy - 3)
    L.put(151, gy - 1, 'H'); L.put(152, gy - 1, 'H'); L.put(153, gy - 1, '*')
    L.row(146, 150, gy - 1, 'o', step=2)
    # crumbling staircase over the big pit
    L.row(158, 160, gy - 3, 'C'); L.row(163, 165, gy - 5, 'C'); L.row(168, 170, gy - 7, 'C'); L.row(173, 175, gy - 5, 'C')
    L.row(178, 180, gy - 3, 'C')
    L.put(169, gy - 13, '*')                     # star 3: high above the middle crumble
    L.row(168, 170, gy - 11, '=')
    arc(L, 157, 181, gy - 9, 4)
    L.ground(183, 235, gy)
    L.put(188, gy - 1, 'g'); L.put(196, gy - 1, 'e'); L.put(204, gy - 1, 'e')
    L.put(192, gy - 5, '?'); L.put(194, gy - 5, '+')
    for i, x in enumerate(range(210, 218, 2)): L.ground(x, x + 1, gy - 1 - i)
    L.ground(218, 235, gy - 4)
    L.put(228, gy - 5, 'G')
    return dict(id=3, name='Thác Bạc', theme='meadow', grid=L, signs=[
        'Ván nứt sẽ sụp sau khi đứng lên. Đi nhanh!',
        'Gai hạt dẻ không giẫm được. Nhảy qua nó.'])

# ───────────────── Level 4 — Hang Rễ (maze: two keys, see the exit first) ─────────────────
def level4():
    W, H = 64, 40
    L = Lvl(W, H, '#')
    # A: start chamber + upper corridor toward the goal door
    L.carve(1, 2, 13, 7)
    L.put(3, 7, 'P'); L.put(6, 7, '~'); L.put(10, 7, 'c')
    L.carve(14, 4, 45, 7)
    L.row(16, 26, 5, 'o', step=2)
    L.carve(20, 8, 22, 9)                        # drop hole into the middle cavern
    L.put(30, 7, 'e'); L.put(38, 7, 'c')
    L.col(46, 4, 7, 'K')                         # gold door
    L.carve(47, 2, 62, 7)
    L.put(56, 7, 'G'); L.put(50, 7, 'c'); L.put(60, 7, 'c')
    L.row(49, 54, 5, 'o', step=2)
    # B: middle cavern (checkpoint junction)
    L.carve(6, 10, 40, 18)
    L.put(21, 18, 'F'); L.put(24, 18, '~')
    L.row(12, 16, 15, '='); L.row(28, 32, 15, '=')
    L.put(14, 13, 'o'); L.put(30, 13, 'o'); L.put(10, 18, 'c'); L.put(33, 18, 'c')
    L.put(36, 18, 'e')
    # teal door on the left leads down to the key vault
    L.col(5, 15, 18, 'J')
    L.carve(1, 15, 4, 18)
    L.carve(1, 19, 3, 33)                        # shaft down (a clean drop)
    # C: right side — spring shaft up to the teal key ledge
    L.carve(41, 12, 61, 18)
    L.put(44, 18, 's')
    L.carve(41, 9, 44, 11); L.row(41, 44, 12, '='); L.row(41, 44, 8, '=')   # the way back up to the corridor
    L.carve(48, 9, 61, 11); L.row(58, 61, 12, '#')
    L.row(46, 50, 13, '='); L.row(52, 56, 11, '=')
    L.put(60, 11, 'j'); L.put(58, 11, 'c')
    L.put(50, 18, 'g')
    L.row(47, 60, 17, 'o', step=3)
    # fake wall pocket with star 1 (fireflies lead in)
    L.put(62, 14, 'H'); L.put(62, 15, 'H'); L.put(62, 16, 'H')
    L.put(61, 15, 'o')
    L.carve(63, 14, 63, 16); L.put(63, 16, '*')
    # D: bottom-left vault with the gold key
    L.carve(4, 30, 26, 34)
    L.put(10, 34, 'k'); L.put(7, 34, 'c')
    L.put(16, 34, 'e'); L.row(12, 20, 32, 'o', step=2)
    # star 2 on a high perch in the vault (spring)
    L.carve(17, 23, 26, 29)
    L.row(21, 25, 28, '#'); L.put(23, 27, '*'); L.put(18, 34, 's')
    # E: bottom corridor to the right and the return spring shaft
    L.carve(27, 32, 56, 34)
    L.put(34, 34, 'g'); L.put(46, 34, 'e')
    L.row(30, 52, 33, 'o', step=4)
    L.carve(57, 20, 61, 34)
    L.put(59, 34, 's'); L.row(57, 61, 27, '='); L.row(57, 61, 23, '=')
    L.row(57, 61, 19, '=')
    # star 3: a side pocket off the return shaft
    L.carve(50, 20, 56, 22); L.put(51, 22, '*'); L.put(54, 22, 'c')
    return dict(id=4, name='Hang Rễ', theme='cave', grid=L, maze=True, signs=[
        'Ngọn đèn cuối hang nằm sau cửa vàng. Chìa khóa ở đâu đó dưới sâu. Nhấn M để xem bản đồ.'])
