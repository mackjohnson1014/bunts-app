export const theme = {
  color: {
    bg: '#0E1116',
    surface: '#171B22',
    surfaceAlt: '#1F242D',
    border: '#2A313C',
    text: '#E8EBF0',
    textMuted: '#8A93A2',
    accent: '#4EA8DE',
    good: '#5CC98C',
    warn: '#E0A458',
    bad: '#E06C75',
  },
  space: (n: number) => n * 4,
  radius: 10,
  font: {
    title: 22,
    heading: 17,
    body: 15,
    small: 13,
    tiny: 11,
  },
} as const;

export const statusColor = (status: string | null) => {
  if (!status) return theme.color.textMuted;
  if (status === 'DTD') return theme.color.warn;
  return theme.color.bad;
};
