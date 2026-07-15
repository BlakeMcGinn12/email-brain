/*
 * Email Brain data.
 *
 * This is the ONLY file you need to change to plug in a real inbox.
 * Replace `emails` with your messages and (optionally) tune `categories`.
 * See DATA_GUIDE.md for the full schema and generation tips.
 *
 * Shape:
 *   window.EMAIL_BRAIN = {
 *     categories: { <key>: { label: string, color: "#rrggbb" }, ... },
 *     emails: [ { sender: string, subject: string, category: <key> }, ... ]
 *   }
 *
 * Notes:
 *   - `category` on an email must match a key in `categories`.
 *     (If it doesn't, a category is auto-created with a fallback color.)
 *   - Emails from the same `sender` are automatically linked together.
 *   - `categories` is optional; omit it to auto-generate from email categories.
 */

window.EMAIL_BRAIN = {
  categories: {
    important: { label: 'Important people', color: '#ffd166' },
    work: { label: 'Work', color: '#63b3ff' },
    finance: { label: 'Finance', color: '#4ade80' },
    newsletters: { label: 'Newsletters', color: '#a78bfa' },
    shopping: { label: 'Shopping & receipts', color: '#f472b6' },
    social: { label: 'Social', color: '#22d3ee' },
  },

  emails: [
    // Important people
    { sender: 'Sarah Chen', subject: 'Re: Q3 budget — need your sign-off', category: 'important' },
    { sender: 'Sarah Chen', subject: 'Board deck v4 attached', category: 'important' },
    { sender: 'Sarah Chen', subject: 'Quick call before Friday?', category: 'important' },
    { sender: 'Mom', subject: 'Sunday dinner?', category: 'important' },
    { sender: 'Mom', subject: 'Photos from the lake', category: 'important' },
    { sender: 'Dr. Patel', subject: 'Appointment confirmed for the 22nd', category: 'important' },
    { sender: 'Landlord', subject: 'Lease renewal terms', category: 'important' },

    // Work
    { sender: 'GitHub', subject: '[acme/app] PR #42: Fix auth token refresh', category: 'work' },
    { sender: 'GitHub', subject: '[acme/app] Build failed on main', category: 'work' },
    { sender: 'GitHub', subject: '[acme/app] You were mentioned in #38', category: 'work' },
    { sender: 'GitHub', subject: 'Security alert: dependency update', category: 'work' },
    { sender: 'Figma', subject: 'Shared file: Onboarding flow', category: 'work' },
    { sender: 'Figma', subject: 'Comments on Design System v2', category: 'work' },
    { sender: 'Notion', subject: 'Comments on Product roadmap', category: 'work' },
    { sender: 'Notion', subject: 'Weekly workspace digest', category: 'work' },
    { sender: 'Slack', subject: 'You have 14 unread threads', category: 'work' },
    { sender: 'Calendar', subject: 'Reminder: Design review at 2pm', category: 'work' },
    { sender: 'Calendar', subject: 'Invite: Sprint planning', category: 'work' },
    { sender: 'HR', subject: 'Benefits enrollment closes Friday', category: 'work' },
    { sender: 'Zoom', subject: 'Cloud recording ready: All hands', category: 'work' },

    // Finance
    { sender: 'Stripe', subject: 'Payout of $1,240.00 is on the way', category: 'finance' },
    { sender: 'Stripe', subject: 'Invoice #8841 paid', category: 'finance' },
    { sender: 'Chase', subject: 'Your statement is ready', category: 'finance' },
    { sender: 'Chase', subject: 'Unusual sign-in attempt blocked', category: 'finance' },
    { sender: 'Chase', subject: 'Payment posted: $84.20', category: 'finance' },
    { sender: 'Robinhood', subject: 'Your monthly account summary', category: 'finance' },
    { sender: 'TurboTax', subject: 'Your estimated quarterly taxes', category: 'finance' },
    { sender: 'PayPal', subject: 'You sent $45.00 to Alex', category: 'finance' },

    // Newsletters
    { sender: 'Substack', subject: 'Weekly digest: 12 new posts', category: 'newsletters' },
    { sender: 'Substack', subject: 'New from Lenny: pricing your product', category: 'newsletters' },
    { sender: 'Morning Brew', subject: "Today's top business stories", category: 'newsletters' },
    { sender: 'Morning Brew', subject: 'The Fed did what?', category: 'newsletters' },
    { sender: 'TLDR', subject: 'TLDR AI 2026-07-14', category: 'newsletters' },
    { sender: 'TLDR', subject: 'TLDR Web Dev 2026-07-13', category: 'newsletters' },
    { sender: 'The Hustle', subject: '10 tools that replaced my stack', category: 'newsletters' },
    { sender: 'Medium', subject: 'Stories picked for you', category: 'newsletters' },

    // Shopping & receipts
    { sender: 'Amazon', subject: 'Your package has been delivered', category: 'shopping' },
    { sender: 'Amazon', subject: 'Order shipped: arriving Thursday', category: 'shopping' },
    { sender: 'Amazon', subject: 'Rate your recent purchase', category: 'shopping' },
    { sender: 'Uber', subject: 'Your Friday trip receipt', category: 'shopping' },
    { sender: 'Uber Eats', subject: 'Order delivered: Thai Basil', category: 'shopping' },
    { sender: 'Apple', subject: 'Your receipt from Apple', category: 'shopping' },
    { sender: 'DoorDash', subject: '20% off your next order', category: 'shopping' },
    { sender: 'Target', subject: 'Your order is ready for pickup', category: 'shopping' },

    // Social
    { sender: 'LinkedIn', subject: 'You have 5 new connection requests', category: 'social' },
    { sender: 'LinkedIn', subject: 'Your post reached 2,400 people', category: 'social' },
    { sender: 'X', subject: 'You have new followers', category: 'social' },
    { sender: 'Instagram', subject: 'alex_dev started following you', category: 'social' },
    { sender: 'Reddit', subject: 'Trending in r/programming', category: 'social' },
    { sender: 'Discord', subject: 'You have unread mentions', category: 'social' },
    { sender: 'Strava', subject: 'Your weekly training summary', category: 'social' },
  ],
};
