# 🚀 Hackathon Project: AI-Powered Workflow Builder - Frontend Tasks

Hey Matteo! 👋

You're going to build the **user interface and user experience** for our AI-powered workflow automation tool. This is a hackathon project where we're building something that lets users create complex n8n automation workflows just by chatting with an AI - no technical knowledge required!

---

## 🎯 Project Overview

**What we're building:**
An AI-powered chat interface where users can describe what automation they want (like "send me a Slack message when someone fills out my contact form"), and our AI will generate the complete workflow for them. Think of it as "ChatGPT for workflow automation."

**Your role:**
Build all the visual components, UI/UX, and make it look beautiful and professional. You'll focus on the frontend experience while your technical partner handles the backend AI integration and workflow generation logic.

**Time constraint:** 
5 hours total for the hackathon

---

## 🛠️ Tech Stack (Already Set Up)

The project is already initialized with:
- **Next.js 15** (App Router) with TypeScript
- **TailwindCSS 4** for styling
- **React 19**
- Located in: `/Users/ncapetillo/Documents/Projects/burning-heroes-x-ef-hackathon/front/`

**You need to add:**
- **shadcn/ui** - Pre-built beautiful components
- **Lucide React** - Icon library
- **Components from 21st.dev** - Additional UI components

**Note:** Your partner will handle React Flow (the graph visualization library) - you don't need to worry about that part!

---

## 🎨 Design Guidelines

**Visual Style:**
- **Modern and clean** - Think Linear, Vercel, or Stripe aesthetics
- **Professional but friendly** - This is a productivity tool
- **Aesthetic colors but not crazy** - Use subtle gradients, soft shadows, and a cohesive color palette
- **Accessible** - Good contrast, readable fonts, clear hierarchy

**Color Palette Suggestion:**
- **Primary:** Blue/Indigo tones (trust, technology)
- **Accent:** Purple or Teal (creativity, AI)
- **Success:** Green
- **Error:** Red
- **Neutral:** Grays for text and backgrounds
- **Background:** White/light gray with subtle gradients

**Typography:**
- Use Next.js default Geist font (already configured)
- Clear hierarchy: Large headings, readable body text
- Consistent spacing

---

## 📦 Setup Instructions

### 1. Install Required Dependencies

```bash
cd /Users/ncapetillo/Documents/Projects/burning-heroes-x-ef-hackathon/front

# Install shadcn/ui
npx shadcn@latest init

# When prompted, choose:
# - TypeScript: Yes
# - Style: Default
# - Base color: Slate or Neutral
# - CSS variables: Yes

# Install shadcn components you'll need
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
npx shadcn@latest add textarea
npx shadcn@latest add badge
npx shadcn@latest add dialog
npx shadcn@latest add toast
npx shadcn@latest add skeleton
npx shadcn@latest add separator

# Install Lucide React for icons
npm install lucide-react

# Start the dev server
npm run dev
```

Now open http://localhost:3000 to see your work!

---

## 🎯 Your Tasks (In Order)

### **Hour 0-1: Landing Page & Setup**

#### Task 1.1: Create the Landing Page
**File:** `src/app/page.tsx`

Build a beautiful landing page with:
- **Hero section** with a catchy headline like "Build Workflows with AI in Seconds"
- **Subheadline** explaining the value proposition
- **CTA button** that says "Try It Now" or "Get Started"
- **Feature highlights** (3-4 key features with icons)
- **Visual elements** like gradients, subtle animations

**Example structure:**
```tsx
export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Build Workflows with AI
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Just describe what you want. Our AI creates the automation for you.
        </p>
        <button className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition">
          Get Started →
        </button>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        {/* Add 3-4 feature cards here */}
      </section>
    </div>
  );
}
```

**Resources:**
- Browse 21st.dev for landing page inspiration: https://21st.dev/
- Use shadcn/ui Card components for feature cards
- Use Lucide React icons (e.g., `<Sparkles />`, `<Zap />`, `<Shield />`)

---

#### Task 1.2: Create the Main Layout
**File:** `src/app/layout.tsx` (already exists, enhance it)

Add:
- **Navigation bar** with logo and links
- **Footer** with links and credits
- Consistent padding and max-width

---

### **Hour 1-2: Chat Interface Components**

#### Task 2.1: Create Chat Page
**File:** `src/app/chat/page.tsx` (create this file)

This is the main application page where users will interact with the AI.

**Your creative freedom:** Design the layout however you think works best! Consider:
- Where should the chat messages appear?
- Should there be a sidebar for templates or history?
- How should the input area be positioned?
- Should the workflow visualization be side-by-side or below the chat?

**Think about the user experience and create a layout that feels intuitive and modern.** Browse 21st.dev or other modern chat interfaces (like ChatGPT, Claude, Linear) for inspiration.

---

#### Task 2.2: Create Chat Message Component
**File:** `src/components/ChatMessage.tsx` (create this file)

Build a reusable message bubble component that shows:
- User messages (right-aligned, blue background)
- AI messages (left-aligned, gray background)
- Optional avatar icons
- Timestamp (optional)

**Example:**
```tsx
import { User, Bot } from 'lucide-react';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp?: string;
}

export function ChatMessage({ message, isUser, timestamp }: ChatMessageProps) {
  return (
    <div className={`flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-blue-500' : 'bg-gray-300'
      }`}>
        {isUser ? <User size={16} className="text-white" /> : <Bot size={16} className="text-gray-700" />}
      </div>

      {/* Message Bubble */}
      <div className={`max-w-[70%] rounded-lg px-4 py-3 ${
        isUser 
          ? 'bg-blue-500 text-white rounded-br-none' 
          : 'bg-gray-100 text-gray-900 rounded-bl-none'
      }`}>
        <p className="text-sm leading-relaxed">{message}</p>
        {timestamp && (
          <span className="text-xs opacity-70 mt-1 block">{timestamp}</span>
        )}
      </div>
    </div>
  );
}
```

**Make it beautiful:**
- Add subtle shadows
- Smooth rounded corners
- Good padding and spacing
- Readable text size

---

#### Task 2.3: Create Chat Input Component
**File:** `src/components/ChatInput.tsx` (create this file)

Build the input area where users type their requests:
- Large textarea (auto-expanding is a nice touch)
- Send button with icon
- Placeholder text with examples
- Disabled state while AI is thinking

**Use shadcn/ui Textarea and Button components**

**Example:**
```tsx
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function ChatInput() {
  return (
    <div className="flex gap-2 items-end">
      <Textarea
        placeholder="Describe the workflow you want to create..."
        className="min-h-[60px] resize-none"
      />
      <Button size="lg" className="h-[60px]">
        <Send size={20} />
      </Button>
    </div>
  );
}
```

---

#### Task 2.4: Create Prompt Suggestions Component
**File:** `src/components/PromptSuggestions.tsx` (create this file)

Show example prompts users can click to get started quickly:

**Examples:**
- "📧 Send email when form is submitted"
- "💬 Post to Slack channel daily at 9am"
- "📊 Sync Google Sheets to database"
- "🐦 Tweet when new blog post is published"

Make them look like clickable chips/pills with:
- Border and hover effect
- Icon + text
- Grid layout (2 columns on mobile, 4 on desktop)

**Use shadcn/ui Badge or create custom buttons**

---

### **Hour 2-3: Loading States & Feedback**

#### Task 3.1: Create Loading Spinner Component
**File:** `src/components/LoadingSpinner.tsx` (create this file)

Show when AI is generating a workflow:
- Animated dots or spinner
- "AI is thinking..." text
- Smooth animation

**Example with bouncing dots:**
```tsx
export function LoadingSpinner() {
  return (
    <div className="flex items-center gap-2 text-gray-500">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm">AI is thinking...</span>
    </div>
  );
}
```

---

#### Task 3.2: Create Status Message Component
**File:** `src/components/StatusMessage.tsx` (create this file)

Show success/error/info messages:
- Success: "✅ Workflow created successfully!"
- Error: "❌ Something went wrong. Please try again."
- Info: "ℹ️ Searching templates..."

**Use shadcn/ui Alert component or create custom**

---

#### Task 3.3: Create Skeleton Loading States
**File:** `src/components/SkeletonCard.tsx` (create this file)

Show placeholder content while data loads:
- Use shadcn/ui Skeleton component
- Create skeleton versions of your cards/messages

---

### **Hour 3-4: Additional Features & Polish**

#### Task 4.1: Create Workflow Template Gallery
**File:** `src/components/TemplateGallery.tsx` (create this file)

Show popular workflow templates users can start from:
- Grid of cards (3 columns on desktop)
- Each card shows:
  - Icon/emoji
  - Template name
  - Short description
  - "Use Template" button

**Example templates:**
- Slack Notifications
- Email Automation
- Data Sync
- Social Media Posting
- Customer Support

**Use shadcn/ui Card component**

---

#### Task 4.2: Create Onboarding Modal
**File:** `src/components/OnboardingModal.tsx` (create this file)

Show first-time users how to use the app:
- 3-step wizard
- Step 1: "Welcome! Describe your workflow"
- Step 2: "AI generates it for you"
- Step 3: "Review and deploy"
- Progress indicator
- Skip button

**Use shadcn/ui Dialog component**

---

#### Task 4.3: Create Empty State Component
**File:** `src/components/EmptyState.tsx` (create this file)

Show when there are no messages yet:
- Friendly illustration or icon
- "Start by describing a workflow..."
- Show prompt suggestions below

---

#### Task 4.4: Polish the UI

Go through everything and:
- Add smooth transitions (`transition-all duration-200`)
- Add hover effects on interactive elements
- Ensure consistent spacing
- Test responsive design (mobile, tablet, desktop)
- Add subtle shadows and borders
- Check color contrast for accessibility

---

### **Hour 4-5: Final Touches & Presentation Prep**

#### Task 5.1: Create Footer Component
**File:** `src/components/Footer.tsx` (create this file)

Add a footer with:
- Project name and tagline
- Links (Docs, GitHub, etc.)
- Credits/team names
- Built with n8n-MCP badge

---

#### Task 5.2: Add Micro-interactions

Add delightful details:
- Button press animations
- Message slide-in animations
- Smooth scrolling
- Fade-in effects for new content

**Use Tailwind's animation utilities or CSS transitions**

---

#### Task 5.3: Create Demo Screenshots

Take screenshots of:
- Landing page
- Chat interface with example conversation
- Generated workflow visualization
- Success states

**Use these for the pitch deck!**

---

#### Task 5.4: Prepare Pitch Deck

Create a presentation (Google Slides or PowerPoint) with:

**Slide 1:** Title + Team
**Slide 2:** Problem - "Building automation workflows is complex"
**Slide 3:** Solution - "AI-powered workflow builder"
**Slide 4:** Demo (screenshots + live demo)
**Slide 5:** How it works (architecture diagram)
**Slide 6:** Market opportunity
**Slide 7:** Next steps / Future features
**Slide 8:** Thank you + Q&A

---

## 🎨 Component Library Resources

### **shadcn/ui Documentation**
- Browse components: https://ui.shadcn.com/docs/components
- Copy/paste ready-to-use components
- Already styled with Tailwind

### **21st.dev**
- Browse for inspiration: https://21st.dev/
- Copy component code directly
- Modern, production-ready designs

### **Lucide React Icons**
- Browse icons: https://lucide.dev/icons
- Import like: `import { Sparkles, Zap, Send } from 'lucide-react'`
- Use like: `<Sparkles size={24} className="text-blue-500" />`

### **TailwindCSS**
- Documentation: https://tailwindcss.com/docs
- Cheat sheet: https://nerdcave.com/tailwind-cheat-sheet

---

## 💡 Quick Tips & Tricks

### **Tailwind Classes You'll Use A Lot:**

```tsx
// Layout
className="flex flex-col gap-4"
className="grid grid-cols-3 gap-6"
className="container mx-auto px-4"

// Spacing
className="p-4 m-2"  // padding, margin
className="px-6 py-3"  // horizontal, vertical

// Colors
className="bg-blue-500 text-white"
className="bg-gradient-to-r from-blue-500 to-purple-500"

// Borders & Shadows
className="border border-gray-200 rounded-lg shadow-lg"

// Hover Effects
className="hover:bg-blue-600 hover:scale-105 transition"

// Responsive
className="text-sm md:text-base lg:text-lg"
className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
```

### **React Component Pattern:**

```tsx
// 1. Import dependencies
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

// 2. Define props interface
interface MyComponentProps {
  title: string;
  onClick?: () => void;
}

// 3. Create component
export function MyComponent({ title, onClick }: MyComponentProps) {
  return (
    <div className="p-4">
      <h2>{title}</h2>
      <Button onClick={onClick}>
        <Send size={16} />
        Click Me
      </Button>
    </div>
  );
}
```

### **Handling State (if needed):**

```tsx
'use client';  // Add this at the top for client components

import { useState } from 'react';

export function MyComponent() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}
```

---

## 📁 File Structure You'll Create

```
front/
├── src/
│   ├── app/
│   │   ├── page.tsx              ← Landing page (YOU)
│   │   ├── chat/
│   │   │   └── page.tsx          ← Chat interface (YOU)
│   │   ├── layout.tsx            ← Enhanced layout (YOU)
│   │   └── globals.css           ← Global styles
│   │
│   └── components/
│       ├── ui/                   ← shadcn components (auto-generated)
│       ├── ChatMessage.tsx       ← (YOU)
│       ├── ChatInput.tsx         ← (YOU)
│       ├── PromptSuggestions.tsx ← (YOU)
│       ├── LoadingSpinner.tsx    ← (YOU)
│       ├── StatusMessage.tsx     ← (YOU)
│       ├── SkeletonCard.tsx      ← (YOU)
│       ├── TemplateGallery.tsx   ← (YOU)
│       ├── OnboardingModal.tsx   ← (YOU)
│       ├── EmptyState.tsx        ← (YOU)
│       └── Footer.tsx            ← (YOU)
```

---

## ✅ Checklist

### **Setup (15 min)**
- [ ] Install shadcn/ui
- [ ] Install Lucide React
- [ ] Run `npm run dev` and verify it works
- [ ] Browse 21st.dev for inspiration

### **Hour 0-1**
- [ ] Landing page with hero section
- [ ] Feature highlights section
- [ ] Enhanced navigation bar
- [ ] Footer component

### **Hour 1-2**
- [ ] Chat page layout
- [ ] ChatMessage component
- [ ] ChatInput component
- [ ] PromptSuggestions component

### **Hour 2-3**
- [ ] LoadingSpinner component
- [ ] StatusMessage component
- [ ] Skeleton loading states
- [ ] Empty state component

### **Hour 3-4**
- [ ] Template gallery
- [ ] Onboarding modal
- [ ] Polish all components
- [ ] Test responsive design

### **Hour 4-5**
- [ ] Final UI polish
- [ ] Add micro-interactions
- [ ] Take screenshots
- [ ] Create pitch deck
- [ ] Practice demo

---

## 🎤 Demo Script (For Presentation)

**Opening (30 sec):**
"Building automation workflows is complex and time-consuming. What if you could just describe what you want in plain English, and AI builds it for you?"

**Demo (2 min):**
1. Show landing page
2. Click "Get Started"
3. Type: "Send a Slack message to #general when someone submits my contact form"
4. Show AI generating the workflow
5. Show the visual workflow graph (your partner's part)
6. Show success message

**Closing (30 sec):**
"That's it! No coding, no complex configuration. Just describe what you want, and our AI handles the rest. Perfect for marketers, product managers, and anyone who needs automation without the technical complexity."

---

## 🆘 Need Help?

### **If you get stuck:**

1. **Check shadcn/ui docs** - Most components are copy/paste ready
2. **Browse 21st.dev** - Find similar components and adapt them
3. **Use Windsurf AI** - Ask it to help you style components or fix issues
4. **Ask your technical partner** - They can help with TypeScript errors or logic

### **Common Issues:**

**"Component not found"**
→ Make sure you installed it: `npx shadcn@latest add [component-name]`

**"Module not found"**
→ Check your imports, make sure path aliases are correct (`@/components/...`)

**"Styles not applying"**
→ Make sure Tailwind is configured correctly, check `globals.css`

**"TypeScript errors"**
→ Add proper type definitions to your props

---

## 🎯 Success Criteria

By the end, you should have:
- ✅ Beautiful, modern landing page
- ✅ Functional chat interface
- ✅ All UI components styled and polished
- ✅ Responsive design (works on mobile)
- ✅ Loading states and feedback
- ✅ Professional presentation deck
- ✅ Demo-ready application

---

## 🚀 Let's Build Something Amazing!

Remember:
- **Focus on UX** - Make it intuitive and delightful
- **Keep it simple** - Don't over-complicate
- **Make it beautiful** - First impressions matter
- **Test as you go** - Check your work frequently
- **Have fun!** - This is a hackathon, enjoy the process!

Your technical partner will handle all the backend AI logic, n8n integration, and React Flow graph visualization. You focus on making the UI/UX incredible!

**Good luck! 🔥**

---

## 📞 Quick Reference

**Project Location:** `/Users/ncapetillo/Documents/Projects/burning-heroes-x-ef-hackathon/front/`

**Start Dev Server:** `npm run dev`

**View App:** http://localhost:3000

**Key Resources:**
- shadcn/ui: https://ui.shadcn.com
- 21st.dev: https://21st.dev
- Lucide Icons: https://lucide.dev
- Tailwind Docs: https://tailwindcss.com

**Your Partner Handles:**
- Backend API routes
- AI integration (OpenAI/Claude)
- n8n-MCP client
- React Flow graph visualization
- Workflow generation logic
- Deployment

**You Handle:**
- All UI components
- All styling
- User experience
- Animations and interactions
- Presentation materials
- Demo preparation
