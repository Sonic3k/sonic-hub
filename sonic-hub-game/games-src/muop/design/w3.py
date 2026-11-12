from lib import Lvl, arc

def pillar(L, x0, x1, top, bottom):
    for x in range(x0, x1 + 1):
        for y in range(top, bottom + 1): L.put(x, y, '#')

# ───────────────── Level 9 — Sườn Tuyết (wind boots: dash, ice, owls) ─────────────────
def level9():
    L = Lvl(232, 26); gy = 23
    L.ground(0, 22, gy)
    L.put(3, gy - 1, 'P'); L.put(6, gy - 1, '~'); L.put(12, gy - 1, 'W'); L.put(19, gy - 1, '~')
    arc(L, 22, 32, gy - 6, 2)
    # a gap too wide to jump: jump, then dash
    L.ground(32, 60, gy)
    for x in range(32, 61): L.put(x, gy, '_')
    L.put(40, gy - 1, 'e'); L.put(54, gy - 1, 'e')
    L.ground(44, 50, gy - 8, gy - 7); L.put(45, gy - 6, 'i'); L.put(48, gy - 6, 'i')
    L.row(34, 42, gy - 3, 'o', step=2)
    arc(L, 60, 65, gy - 4, 2)
    L.ground(65, 82, gy)
    L.put(68, gy - 1, 'F'); L.put(76, gy - 7, 'y')
    # a tunnel sealed by cracked ice: dash through it
    L.put(81, gy - 1, '~')
    L.ground(84, 98, gy - 6, gy - 4)
    L.col(91, gy - 3, gy - 1, 'X'); L.col(92, gy - 3, gy - 1, 'X')
    L.ground(83, 109, gy)
    L.row(94, 99, gy - 2, 'o')
    # star 1: a fake block in the tunnel roof
    L.put(96, gy - 4, 'H'); L.carve(96, gy - 6, 97, gy - 5); L.put(96, gy - 5, '*')
    # climb and dash over the chasm at the top
    pillar(L, 105, 106, gy - 16, gy - 3)
    L.ground(110, 130, gy - 16)
    L.col(108, gy - 14, gy - 4, 'o')
    L.put(118, gy - 17, 'g'); L.put(126, gy - 22, 'y')
    L.put(136, gy - 20, '*')                             # star 2: over the chasm
    arc(L, 130, 142, gy - 20, 2)
    L.ground(142, 168, gy - 14)
    L.put(146, gy - 15, 'F'); L.put(154, gy - 15, 'e'); L.put(162, gy - 15, 'g')
    L.put(158, gy - 19, '?')
    # icy stairs down
    for i, x in enumerate(range(169, 185, 4)):
        L.ground(x, x + 3, gy - 12 + i * 3)
        for xx in range(x, x + 4): L.put(xx, gy - 12 + i * 3, '_')
    # star 3: floating past the cliff's end — leap and dash for it
    L.put(175, gy - 17, '*')
    L.ground(185, 231, gy - 2)
    L.put(192, gy - 3, 'e'); L.put(200, gy - 8, 'y'); L.put(208, gy - 3, 'g')
    L.row(196, 206, gy - 6, 'o', step=2)
    L.put(223, gy - 3, 'G')
    return dict(id=9, name='Sườn Tuyết', theme='snow', grid=L, ability='dash', signs=[
        'Đôi giày gió đang chờ ai đó.',
        'Nhảy lên rồi lướt giữa không trung để qua vực rộng.',
        'Lướt thẳng vào khối băng nứt để phá nó.'])

# ───────────────── Level 10 — Hang Pha Lê (dark: dash crystals, icicles, turret, secrets) ─────────────────
def level10():
    L = Lvl(210, 30); gy = 27
    L.rect(0, 0, 209, 3, '#')
    L.ground(0, 17, gy)
    L.put(3, gy - 1, 'P'); L.put(6, gy - 1, '~'); L.put(10, gy - 1, 'c')
    # crystal chain over a spike pit
    L.ground(18, 33, gy); L.row(18, 29, gy - 1, '^')
    L.put(24, gy - 5, 'd')
    arc(L, 18, 29, gy - 9, 2)
    L.ground(34, 62, gy)
    L.put(37, gy - 1, 'c'); L.put(41, gy - 1, 'e')
    # icicle corridor under a low roof
    L.ground(46, 62, 4, gy - 7)
    for x in (48, 51, 54, 57, 60): L.put(x, gy - 6, 'i')
    L.row(47, 61, gy - 2, 'o', step=2)
    # chimney up beside the cliff (mind the spikes on the cliff face)
    pillar(L, 63, 63, 8, gy - 3); L.ground(63, 66, gy)
    L.ground(67, 96, 9)
    L.col(66, 14, 16, '<')
    for y in (11, 12, 19, 21, 23): L.put(65, y, 'o')
    L.put(70, 8, 'F'); L.put(74, 8, 'c'); L.put(80, 8, 'e')
    L.rect(88, 6, 89, 8, '#'); L.put(88, 7, 'r')
    # the dark chamber below
    L.ground(97, 150, gy); L.ground(97, 150, 4, 7)
    for x in (100, 112, 126, 138): L.put(x, gy - 1, 'c')
    L.put(106, gy - 1, 'e'); L.put(118, gy - 1, 'g'); L.put(130, gy - 1, 'e')
    for x in (104, 116, 128): L.put(x, 9, 'i')
    # star 2: a fake wall at the foot of the cliff
    L.carve(93, gy - 2, 95, gy - 1); L.put(96, gy - 1, 'H'); L.put(96, gy - 2, 'H'); L.put(94, gy - 1, '*')
    L.put(99, gy - 1, 'o'); L.put(98, gy - 2, 'o')
    # climb out: one-ways then a dash onto the high road
    L.row(145, 149, 23, '='); L.row(140, 144, 19, '='); L.row(145, 149, 15, '='); L.row(140, 144, 11, '=')
    L.put(147, 9, 'd')
    L.ground(151, 209, 9)
    # star 1: cracked stone at the chamber's end
    L.col(150, gy - 3, gy - 1, 'X'); L.carve(151, gy - 3, 153, gy - 1); L.put(152, gy - 1, '*')
    L.put(156, 8, 'F'); L.put(160, 8, 'c')
    # star 3: over a spike trench on the high road, crystals to hop
    L.carve(166, 9, 174, 12); L.row(166, 174, 12, '^')
    L.put(169, 7, 'd'); L.put(172, 6, 'd'); L.put(170, 5, '*')
    L.row(177, 196, 8, 'o', step=3)
    L.put(184, 8, 'g'); L.put(192, 8, 'e'); L.put(198, 8, 'c')
    L.put(202, 8, 'G')
    return dict(id=10, name='Hang Pha Lê', theme='crystal', grid=L, signs=[
        'Pha lê xanh nạp lại một lần lướt khi chạm vào giữa không trung.'])

# ───────────────── Level 11 — Cầu Gió (wind gusts over chasms: everything together) ─────────────────
def level11():
    L = Lvl(250, 24); gy = 21
    L.ground(0, 18, gy)
    L.put(3, gy - 1, 'P'); L.put(6, gy - 1, '~')
    # rope bridges (one-ways) across chasms, gusts push back
    L.row(19, 34, gy - 2, '=')
    L.put(26, gy - 7, 'y')
    L.ground(35, 42, gy)
    L.row(43, 50, gy - 4, '='); L.row(54, 61, gy - 6, '=')
    L.put(57, gy - 7, 'e')
    L.ground(62, 72, gy - 3)
    L.put(65, gy - 4, 'F')
    # lift + turret
    L.put(73, gy - 4, 'm'); L.put(84, gy - 4, ':')
    L.rect(90, gy - 8, 91, gy, '#'); L.put(90, gy - 5, 'r')
    L.ground(88, 91, gy)
    L.ground(92, 104, gy - 6)
    L.put(98, gy - 7, 'g')
    arc(L, 74, 87, gy - 9, 2)
    # a dash across with a crystal, star 1 above it
    L.put(109, gy - 7, 'd')
    L.put(109, gy - 11, '*')
    L.ground(115, 132, gy - 6)
    L.put(124, gy - 7, 'e'); L.put(128, gy - 11, 'y')
    # chimney up to the high bridge
    L.ground(133, 137, gy - 6)
    pillar(L, 133, 134, gy - 17, gy - 8)
    L.ground(138, 160, gy - 17)
    L.col(136, gy - 16, gy - 9, 'o')
    L.put(145, gy - 18, 'F')
    L.row(161, 176, gy - 17, 'C')
    L.put(168, gy - 21, 'y')
    L.ground(177, 186, gy - 17, gy - 15)
    L.put(181, gy - 18, 'g')
    # star 2: down in the valley under the bridge; a spring and the lift lead back out
    L.ground(161, 191, gy); L.row(161, 168, gy - 1, '^')
    L.put(173, gy - 1, 's'); L.put(171, gy - 10, '*')
    L.row(170, 172, gy - 9, '=')
    # descent on a lift, then a crystal dash
    L.put(188, gy - 16, 'n'); L.put(188, gy - 4, ':')
    L.ground(192, 200, gy - 4)
    L.put(196, gy - 5, 'e')
    L.put(205, gy - 6, 'd')
    L.ground(211, 249, gy - 3)
    L.put(222, gy - 4, 'g'); L.put(230, gy - 9, 'y')
    # star 3: spring, dash, crystal, dash — onto a lonely ledge
    L.put(226, gy - 4, 's'); L.put(229, gy - 12, 'd')
    L.row(232, 236, gy - 11, '#'); L.put(234, gy - 12, '*')
    L.put(244, gy - 4, 'G')
    return dict(id=11, name='Cầu Gió', theme='snow', grid=L, wind=dict(period=330, dur=120, force=0.085, dir=-1), signs=[
        'Gió giật từng cơn từ phía trước. Nghe tiếng gió thì đứng vững rồi hẵng nhảy.'])

# ───────────────── Level 12 — Tháp Đèn (final maze: sun/moon, two keys, warps, crystals) ─────────────────
def level12():
    W, H = 48, 66
    L = Lvl(W, H, '#')
    # ── the Crown (top): goal behind the gold door; warp 1 lands here ──
    L.carve(1, 2, 46, 9)
    L.col(30, 2, 9, 'K')
    L.put(40, 9, 'G'); L.put(34, 9, 'L'); L.put(44, 9, 'L'); L.put(16, 9, 'L'); L.put(27, 9, 'L')
    L.put(20, 9, '1'); L.put(24, 9, 'F')
    L.row(33, 45, 6, 'o', step=2)
    L.rect(9, 2, 11, 9, '#'); L.put(9, 9, 'H'); L.put(10, 9, 'H'); L.put(11, 9, 'H')    # star 3 inside a fake pillar
    L.carve(3, 7, 7, 9); L.put(4, 9, '*'); L.put(6, 9, 'c')
    # ── gold key room + chimney (needs the sun wall) ──
    L.carve(1, 13, 10, 16)
    L.put(9, 16, 'k'); L.put(5, 16, 'L')
    L.carve(1, 17, 3, 40)
    L.col(4, 19, 35, 'a')
    L.carve(5, 19, 9, 35)
    L.col(2, 20, 34, 'o')
    L.carve(1, 41, 6, 44)
    L.col(7, 41, 44, 'J')
    # ── the hub ──
    L.carve(8, 37, 38, 44)
    L.put(14, 40, 'T')
    L.put(30, 44, 'F'); L.put(11, 44, 'L'); L.put(36, 44, 'L'); L.put(27, 44, 'e')
    L.put(17, 44, '~')
    L.row(9, 37, 38, 'o', step=4)
    # ── central shaft: the middle step only exists at night ──
    L.carve(20, 45, 24, 62)
    L.row(20, 24, 61, '='); L.row(20, 24, 57, '='); L.row(20, 24, 53, 'b'); L.row(20, 24, 49, '=')
    for y in (59, 55, 51, 47): L.put(22, y, 'o')
    # ── teal wing: jump + dash (+ crystal) over spikes; a spring hatch leads back up ──
    L.carve(32, 45, 34, 47)
    L.carve(26, 48, 46, 60)
    L.row(26, 46, 60, '^')
    L.row(30, 35, 50, '#')
    L.put(39, 50, 'd')
    L.row(44, 46, 52, '#'); L.put(44, 51, 'j'); L.put(46, 51, 's')
    L.carve(39, 41, 46, 44); L.carve(44, 46, 46, 47); L.row(44, 46, 45, '=')
    L.put(39, 48, '*')
    L.put(28, 49, 'c'); L.put(42, 55, 'y')
    # ── the hall (bottom): start, switch, spring, moon gate, warp 1 ──
    L.carve(1, 63, 46, 64)
    L.carve(1, 59, 18, 64)
    L.carve(25, 59, 46, 64)
    L.put(3, 64, 'P'); L.put(6, 64, '~'); L.put(12, 60, 'T')
    L.put(9, 64, 'L'); L.put(27, 64, 'L'); L.put(22, 64, 's')
    L.col(31, 59, 64, 'b')
    L.put(38, 64, '1'); L.put(35, 64, 'L')
    L.col(43, 59, 64, 'X'); L.put(45, 64, '*')          # star 1 behind cracked stone
    L.row(33, 41, 61, 'o', step=2)
    return dict(id=12, name='Tháp Đèn', theme='tower', grid=L, maze=True, signs=[
        'Ngọn đèn lớn ở đỉnh tháp. Cổng xanh chỉ đóng khi trời đêm.',
        'Chìa ngọc mở cửa phía tây. Chìa vàng mở cửa đỉnh tháp.'])
