export const colors = {
  background: '#FAFAFA',
  white: '#FFFFFF',
  primary: '#0D4F2C',
  primaryMuted: '#1B6B3F',
  primarySoft: '#3A7056',
  text: '#1A1A1A',
  textSecondary: '#5C6670',
  border: '#E8EBEF',
  cardShadow: 'rgba(13, 79, 44, 0.08)',
  danger: '#C62828',
  accentTennis: '#C8E600',
  accentTennisDeep: '#2E7D32',
  accentSquash: '#B71C1C',
  accentSquashDark: '#212121',
  accentPickleTeal: '#00838F',
  accentPickleOrange: '#FF6D00',
};

export function sportAccent(sport: string): { primary: string; secondary: string } {
  switch (sport) {
    case 'tennis':
      return { primary: colors.accentTennisDeep, secondary: colors.accentTennis };
    case 'squash':
      return { primary: colors.accentSquashDark, secondary: colors.accentSquash };
    case 'pickleball':
      return { primary: colors.accentPickleTeal, secondary: colors.accentPickleOrange };
    default:
      return { primary: colors.primary, secondary: colors.primaryMuted };
  }
}
