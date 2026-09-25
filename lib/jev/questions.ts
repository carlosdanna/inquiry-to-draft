import type { QuestionSet } from "./decision-model";

// Every question we ask the decision model about an inquiry email.
export const INQUIRY_QUESTIONS = {
  eventType: {
    type: "choice",
    instructions: "What kind of event is the customer asking the hotel to host?",
    options: {
      wedding: "A wedding or wedding reception",
      conference: "A conference, sales kickoff or multi-session business meeting",
      offsite: "A team offsite, planning day or workshop away from the office",
      dinner: "A private or client dinner as the main event",
      product_launch: "The launch or presentation of a new product or service",
      other: "Any other kind of event, or the email does not say",
    },
  },
  overnightRooms: {
    type: "yes_no",
    instructions: "Does the customer need hotel rooms for anyone to stay overnight?",
    whenYes: "Some guests need to sleep at the hotel, or the customer asks whether they can",
    whenNo: "Nobody needs a room for the night",
  },
  catering: {
    type: "yes_no",
    instructions: "Does the customer want food or drinks served?",
    whenYes: "Meals, breaks, coffee, drinks or snacks are mentioned as wanted",
    whenNo: "No food or drinks are asked for",
  },
  equipment: {
    type: "yes_no",
    instructions:
      "Does the customer need audio or visual equipment, such as a projector, screen or microphones?",
    whenYes: "Presentation, sound or screen equipment is asked for",
    whenNo: "No equipment is asked for",
  },
  dietaryNotes: {
    type: "yes_no",
    instructions:
      "Does the email mention any dietary needs, such as vegetarian food or allergies?",
    whenYes: "At least one dietary need or allergy is mentioned",
    whenNo: "No dietary needs are mentioned",
  },
  urgency: {
    type: "score",
    instructions: "How soon does the customer need an answer or the event itself?",
    levels: [
      "Not urgent: the event is months away and no deadline is given",
      "Soon: the event is within a few weeks, or a reply is wanted this week",
      "Urgent: the event is within days",
      "Immediate: the customer wants an answer today",
    ],
  },
  language: {
    type: "choice",
    instructions: "Which language is the email written in?",
    options: {
      english: "English",
      swedish: "Swedish",
      other: "Any other language",
    },
  },
} as const satisfies QuestionSet;

export type InquiryQuestionId = keyof typeof INQUIRY_QUESTIONS;
