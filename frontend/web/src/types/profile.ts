export interface StudentProfile {
  id: string; // Unique ID (UUID)
  name: string;
  grade: string;
  className: string;
  subject: string; // Default subject preference?
  avatar?: string; // Optional avatar URL or color
  examName?: string; // Last exam name
  examTime?: string; // Last exam time
}
