// Auto-generated from email-swipe training data
// Generated: 2026-07-15T11:53:00Z
// Total swipes: 50

window.EMAIL_BRAIN = {
  categories: {
    priority: { label: "Priority", color: "#4ade80" },      // Green - consistently kept, important
    keep: { label: "Keep", color: "#63b3ff" },              // Blue - kept but not priority
    review: { label: "Needs Review", color: "#fbbf24" },    // Yellow - mixed/matches watch rules
    spam: { label: "Spam", color: "#f87171" },              // Red - marked as spam
    promotions: { label: "Promotions", color: "#a78bfa" },  // Purple - newsletters/deals
    social: { label: "Social", color: "#f472b6" },          // Pink - social media
    work: { label: "Work", color: "#22d3ee" },              // Cyan - work-related
    shopping: { label: "Shopping", color: "#fb923c" }       // Orange - orders/receipts
  },
  
  emails: [
    // Priority - blakemcginn.com emails (consistently kept, high confidence)
    { sender: "Blake McGinn", subject: "AI Innovations Automate Key Roles Across Industries", category: "priority" },
    { sender: "Blake McGinn", subject: "AI Automation Reshapes Job Roles Across Industries", category: "priority" },
    { sender: "Blake McGinn", subject: "AI Automation Risks: Microsoft's Layoffs and AI-Driven Security Tools", category: "priority" },
    
    // Keep - other kept emails
    { sender: "Chicago Sport & Social Club", subject: "Castaways (Vandenberg) Game Reminder: Thursday at 7:30 PM", category: "keep" },
    { sender: "Postmark", subject: "Weekly Digest for Blake McGinn", category: "keep" },
    { sender: "Jira", subject: "PROJ-2847 assigned to you: Fix login redirect bug", category: "work" },
    { sender: "Your Manager", subject: "Q3 priorities — need your input", category: "work" },
    { sender: "GitHub", subject: "[acme-corp/app] New pull request #42", category: "work" },
    { sender: "Vendor CRM", subject: "Quick question about your email workflow", category: "keep" },
    
    // Work-related spam (for visual variety)
    { sender: "HR Department", subject: "Action required: Benefits enrollment deadline", category: "work" },
    { sender: "HR Team", subject: "Action required: Open enrollment ends Friday", category: "work" },
    { sender: "Payroll", subject: "Your pay stub is ready", category: "work" },
    
    // Social - LinkedIn, Facebook, etc.
    { sender: "LinkedIn", subject: "Abbey Kelliher and others share their thoughts on LinkedIn", category: "social" },
    { sender: "LinkedIn", subject: "New skill available: Puzzle solving 🧩", category: "social" },
    { sender: "LinkedIn", subject: "👤 Blake, add Cara Wiemeyer, PsyD - Psychotherapist", category: "social" },
    { sender: "LinkedIn", subject: "CCIM Institute reveals retail co-tenancy patterns with data tools", category: "social" },
    { sender: "LinkedIn", subject: "You have 5 new connection requests", category: "social" },
    { sender: "LinkedIn", subject: "Someone viewed your profile", category: "social" },
    { sender: "LinkedIn", subject: "12 new jobs match your profile", category: "social" },
    { sender: "Christina on Facebook", subject: "💬 Christina Neitzke-Troike commented...", category: "social" },
    
    // Shopping/Orders
    { sender: "Amazon", subject: "Your package has been delivered", category: "shopping" },
    { sender: "Amazon", subject: "Your package was delivered", category: "shopping" },
    { sender: "Stripe", subject: "Receipt for $29.00 from Notion", category: "shopping" },
    
    // Promotions/Newsletters
    { sender: "FantasyPros", subject: "What does Amazon have to do with fantasy football? 🏈", category: "promotions" },
    { sender: "FantasyPros", subject: "18 high-upside RB targets 🏈📈", category: "promotions" },
    { sender: "NFL Daily", subject: "Latest 'NFL Top 100' reveal; AFC North training camp storylines", category: "promotions" },
    { sender: "NFL Daily", subject: "Three biggest training camp storylines for each AFC East team", category: "promotions" },
    { sender: "NFL Daily", subject: "NFL Top 100' continues; NFL celebrates 250th Independence Day", category: "promotions" },
    { sender: "PFF Insider Scoop", subject: "🏈 Every Starting QB, Ranked: 1-32", category: "promotions" },
    { sender: "Nathan Jahnke | PFF", subject: "🏆 10 weeks of daily rankings, lists and draft strategy starts now", category: "promotions" },
    { sender: "Substack", subject: "The Pragmatic Engineer — new post", category: "promotions" },
    { sender: "Netflix", subject: "New arrivals you might like", category: "promotions" },
    { sender: "Kraken", subject: "Knockouts = heating up 🔥 🥊", category: "promotions" },
    { sender: "Groupon", subject: "90% OFF spa day — TODAY ONLY", category: "promotions" },
    { sender: "Chelsea with IFTTT", subject: "10 new tools for hiring, invoicing, and closing deals 💼", category: "promotions" },
    
    // Spam - Marketing/Cold emails
    { sender: "Shutterstock", subject: "Master the art of visual storytelling", category: "spam" },
    { sender: "Cursor Team", subject: "Cursor and SpaceXAI's new model: Grok 4.5", category: "spam" },
    { sender: "LottieFiles", subject: "Motion System is live & it lives where you already work", category: "spam" },
    { sender: "Indeed", subject: "Outbound Marketing Specialist @ Givzey", category: "spam" },
    { sender: "Google Play", subject: "Updates to Google Play Terms of Service", category: "spam" },
    { sender: "Will from UpLead", subject: "zero booked calls lately?", category: "spam" },
    { sender: "monday insights", subject: "Your next great hire will surprise you", category: "spam" },
    { sender: "Glassdoor Community", subject: "Is NYC still worth it if you're single and mid-30s?", category: "spam" },
    { sender: "xAI", subject: "xAI API Invoice for 06/2026", category: "spam" },
    { sender: "BeenVerified", subject: "Your weekly expert advice summary is here.", category: "spam" },
    { sender: "Grant Thornton Careers", subject: "Thank you for your interest in Grant Thornton-Sr Associate...", category: "spam" },
    
    // Review - watchlist matches (urgent keywords that were spam in training)
    { sender: "Figma", subject: "New comment on \"Dashboard v2\"", category: "review" },
    { sender: "GitHub", subject: "[repo] CI failed on main", category: "review" },
    { sender: "Bank of America", subject: "Unusual activity detected on your account", category: "review" },
    { sender: "Google", subject: "Security alert: new sign-in on Mac", category: "review" }
  ]
};
