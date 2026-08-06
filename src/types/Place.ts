export interface Place {
  id: number;
  name: string;
  description?: string;
  lat: number;
  lng: number;
  city?: string;
  ownerUsername?: string;
  imageUrl?: string;
  price?: number;
  verificationCount?: number;
  lastVerificationDate?: string;
  placeType?: 'BAR' | 'RESTAURANT' | 'BREWERY';
  hasUserVerified?: boolean; // Champ pour savoir si l'utilisateur connecté a déjà vérifié ce lieu
}

export interface PlaceRequest extends Omit<Place, 'id'> {
  id?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requesterUsername?: string;
  placeType?: 'BAR' | 'RESTAURANT' | 'BREWERY';
}
