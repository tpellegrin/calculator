import styled from 'styled-components';

export const CalculatorRoot = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 25rem;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacers.md};
  background-color: ${({ theme }) => theme.colors.surface.base};
  border-radius: ${({ theme }) => theme.borderRadii.lg};
  box-shadow: ${({ theme }) => theme.shadows.elevation.lg};
  gap: ${({ theme }) => theme.spacers.md};
`;

export const DisplayArea = styled.div`
  display: flex;
  flex-direction: column;
  background-color: ${({ theme }) => theme.colors.surface.onDark};
  color: ${({ theme }) => theme.colors.text.onDarkPrimary};
  padding: ${({ theme }) => theme.spacers.md};
  border-radius: ${({ theme }) => theme.borderRadii.md};
  min-height: 6.25rem;
  justify-content: flex-end;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacers.xxs};
`;

export const PreviousResultText = styled.div`
  font-family: ${({ theme }) => theme.fontFamilies.accent};
  font-size: ${({ theme }) => theme.fontSizes.caption};
  color: ${({ theme }) => theme.colors.text.onDarkSecondary};
  min-height: 1.2em;
`;

export const MainDisplay = styled.div`
  font-family: ${({ theme }) => theme.fontFamilies.primary};
  font-size: ${({ theme }) => theme.fontSizes.headingXLarge};
  font-weight: ${({ theme }) => theme.fontWeights.primary.semiBold};
  word-break: break-all;
  text-align: right;
  line-height: 1;
`;

export const KeypadGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.spacers.xs};
`;

export const StatusArea = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 1.5rem;
`;

export const ErrorText = styled.div`
  color: ${({ theme }) => theme.colors.status.error};
  font-size: ${({ theme }) => theme.fontSizes.caption};
  font-weight: ${({ theme }) => theme.fontWeights.primary.medium};
`;

export const LoadingText = styled.div`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.caption};
`;

export const RetryRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacers.xs};
`;
