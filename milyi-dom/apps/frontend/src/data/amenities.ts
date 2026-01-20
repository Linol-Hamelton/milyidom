import type { Amenity } from '../types/api';

export const fallbackAmenities: Amenity[] = [
  { id: 1, name: 'Wi-Fi', category: 'Connectivity', icon: 'wifi' },
  { id: 2, name: 'Air conditioning', category: 'Comfort', icon: 'ac' },
  { id: 3, name: 'Heating', category: 'Comfort', icon: 'thermometer' },
  { id: 4, name: 'Washer', category: 'Utilities', icon: 'washer' },
  { id: 5, name: 'Dryer', category: 'Utilities', icon: 'dryer' },
  { id: 6, name: 'Kitchen', category: 'Essentials', icon: 'kitchen' },
  { id: 7, name: 'Workspace', category: 'Business', icon: 'briefcase' },
  { id: 8, name: 'Parking', category: 'Convenience', icon: 'parking' },
];
