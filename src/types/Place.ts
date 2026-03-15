export interface Place {
  id: number;
  name: string;
  description?: string;
  lat: number;
  lng: number;
  city?: string;
  ownerUsername?: string;
  imageUrl?: string;
}
