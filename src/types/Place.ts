export interface Place {
  id: number;
  name: string;
  description?: string;
  lat: number;
  lng: number;
  city?: string;
  ownerUsername?: string;
  imageUrl?: string;
  price?: number; // Ajout du prix de l'Orval
  verificationCount?: number;
  lastVerificationDate?: string;
}

export interface PlaceRequest extends Omit<Place, 'id'> {
  id?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requesterUsername?: string;
}
