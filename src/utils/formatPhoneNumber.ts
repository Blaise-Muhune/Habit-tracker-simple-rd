export const formatPhoneNumber = (number: string): string => {
  // Remove all non-digit characters
  const digits = number.replace(/\D/g, '');
  
  // Add US country code if not present
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  return `+${digits}`;
}; 