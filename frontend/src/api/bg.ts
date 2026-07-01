export function bgStyle(page: string) {
  const map: Record<string, string> = {
    home: '/bg/bg2.jpg',
    wardrobe: '/bg/bg3.jpg',
    outfits: '/bg/bg4.jpg',
    tryon: '/bg/bg5.jpg',
    builder: '/bg/bg6.jpg',
    recommend: '/bg/bg3.jpg',
    nickname: '/bg/bg1.jpg',
  }
  return {
    backgroundImage: `url(${map[page] || map.home})`,
    backgroundSize: 'cover' as const,
    backgroundPosition: 'center',
  }
}
