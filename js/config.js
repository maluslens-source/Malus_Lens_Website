/*
 * Malus Lens — site configuration & content.
 * Everything the Malus Lens team may need to change lives here.
 * Empty strings / null values render as clearly-marked placeholders
 * (when showPlaceholders is true) and are never replaced with invented data.
 */
window.MALUS_CONFIG = {
  // While true, missing values show as [PLACEHOLDER] chips. Set false for production
  // to hide anything that has not been supplied/approved.
  showPlaceholders: true,

  appUrl: 'https://app.maluslens.com',        // [APPLICATION URL]  e.g. https://app.maluslens.com
  bookingUrl: '',    // [BOOKING URL]      e.g. https://calendly.com/maluslens/meeting
  demoUrl: '',       // optional separate demo link — falls back to bookingUrl

  contact: {
    email: 'info@maluslens.com',
    phone: '+91 78899 24078',
  },

  social: { linkedin: '', instagram: '', x: '' },
  legal: { privacy: 'privacy.html', terms: 'terms.html' },

  // Only publish APPROVED figures. value: number (animated count-up) or string.
  metrics: [
    { key: 'grading', label: 'Grading accuracy', value: 94, suffix: '%', description: 'Grade A / B classification' },
    { key: 'detection', label: 'Detection accuracy', value: 99, suffix: '%', description: 'Apples found in each image' },
    { key: 'time', label: 'Processing time', value: 10, suffix: 's', description: 'Per crate' },
  ],

  // Real, approved testimonials only: { quote, name, role, organisation, photo }
  testimonials: [
    { quote: 'Malus Lens has made the apple inspection process much easier for us. The reports are generated quickly and it helps us get a clearer picture of the quality of apples coming into our storage.', name: 'Asif Jehangir Reshi', role: '', organisation: 'Shaheen Agro Pvt. Ltd.', photo: '' },
    { quote: 'Earlier, checking the quality of incoming apples used to take considerable time. With Malus Lens, the process is much quicker and more organised. It is a useful addition to our operations.', name: 'Nadeem Parra', role: '', organisation: 'Orchard Fresh Cold Chain Pvt. Ltd.', photo: '' },
    { quote: 'What I liked about Malus Lens is that it provides a quick assessment along with a proper report. It has potential to make quality checking more systematic for cold-storage operators.', name: 'Mohsin Mir', role: '', organisation: 'Fruitmont Pvt. Ltd.', photo: '' },
  ],
};

window.MALUS_CONTENT = {
  benefits: [
    { key: 'fast', title: 'Fast', text: 'Designed to help teams assess apple quality quickly when time matters most.' },
    { key: 'precise', title: 'Precise', text: 'AI-powered computer vision provides a consistent approach to quality assessment.' },
    { key: 'reliable', title: 'Reliable', text: 'Turn visual assessment into structured, measurable quality information.' },
    { key: 'sustainable', title: 'Sustainable', text: 'Support more efficient agricultural operations through smarter technology and better data.' },
    { key: 'data', title: 'Data-Driven', text: 'Convert visual quality information into clear percentages and measurable insights.' },
  ],
  operations: [
    { title: 'Apple Intake', text: 'Help teams assess sampled apple lots quickly during intake.', img: 'images/photos/ml-intake-shed.jpg', alt: 'Crates arriving at the intake shed of a Kashmir cold store' },
    { title: 'Peak Season', text: 'Support quality assessment when storage facilities are handling high volumes.', img: 'images/photos/ml-bin-stacks.jpg', alt: 'A forklift moving wooden apple bins between full stacks in cold storage' },
    { title: 'Consistent Assessment', text: 'Give teams a standardized AI-assisted assessment approach.', img: 'images/photos/ml-inspection.jpg', alt: 'A worker checking apples in a red crate' },
    { title: 'Better Data', text: 'Turn quality assessment into measurable information that can be documented and communicated.', img: 'images/photos/ml-crate-rows.jpg', alt: 'Rows of sampled apple crates on pallets, seen from above' },
  ],
  why: [
    { title: 'Built for apple quality assessment', text: 'Designed specifically around apple quality assessment rather than generic image recognition.' },
    { title: 'Designed for cold-storage operations', text: 'Made for operational environments where speed and simplicity matter.' },
    { title: 'Simple for workers', text: 'The experience is designed to minimise unnecessary complexity on the floor.' },
    { title: 'Data instead of guesswork', text: 'Measurable results rather than relying entirely on subjective visual assessment.' },
  ],
};
