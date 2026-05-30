import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const buttonStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryCompact: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    borderRadius: 28,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: colors.primarySoft,
    fontWeight: '700',
    fontSize: 17,
  },
  primaryTextCompact: {
    color: colors.primarySoft,
    fontWeight: '600',
    fontSize: 15,
  },
  primaryTextSmall: {
    color: colors.primarySoft,
    fontWeight: '600',
    fontSize: 15,
  },
  disabled: { opacity: 0.6 },
  iconCircle: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
