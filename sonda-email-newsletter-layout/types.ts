export interface FeedbackItem {
  id: string;
  name: string;
  feedback: string[];
  client: string;
  company: string;
}

export interface FeedbackSection {
  items: FeedbackItem[];
}