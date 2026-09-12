import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

export const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Google GenAI lazily or with graceful fallback
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // In production, we might want to fail or use a placeholder
      // For Vercel, the key should be in Environment Variables
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// 1. HELP CENTER AI ASSISTANT ENDPOINT
app.post('/api/ai/help-center', async (req, res) => {
  try {
    const { message, history = [], userContext = {} } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const ai = getAI();
    const systemInstruction = `You are "ShohojBuy Help Assistant (সহায়তা কেন্দ্র এআই)", a friendly, polite, and highly intelligent ecommerce shopping guide & policy assistant for the ShohojBuy app in Bangladesh.
Your goal is to clearly explain app rules, how to shop, policies, delivery timelines, payment options, returns, and vouchers in easy, friendly Bengali (বাংলা).

Key Store Information & Policies:
- App Name: ShohojBuy (সহজবাই) - "সহজে কেনাকাটা, সুন্দর জীবনের জন্য"
- Delivery Timelines & Charges:
  * Inside Dhaka: 24 to 48 hours, Delivery charge 60 ৳ (Taka)
  * Outside Dhaka: 3 to 5 business days, Delivery charge 120 ৳ (Taka)
  * Free delivery available on selected Mega Deals and voucher codes
- Return & Refund Policy:
  * 7 days free return policy if product is damaged, incorrect, or defective
  * Return can be applied directly from Profile > My Orders > Returns & Cancellations
  * Refunds processed within 24-48 hours via original payment method (bKash/Nagad/Bank)
- Payment Methods:
  * Cash on Delivery (COD) available across all 64 districts in Bangladesh
  * Mobile Banking: bKash (বিকাশ), Nagad (নগদ), Rocket (রকেট) - with extra 5% instant cashback
  * Debit/Credit Cards (Visa, Mastercard, DBBL Nexus)
- Order Tracking:
  * Profile > My Orders > "To Ship" / "To Receive" / "View All Orders"
- Contact Information for Escalations:
  * 24/7 Hotline: 09612-345678 (8 AM - 11 PM)
  * WhatsApp Live Support: +880 1912-345678
  * Official Email: support@shophive.bd

Format your response nicely with clean bullet points, emojis where helpful, and a polite, encouraging tone. Keep answers clear, accurate, and concise.`;

    // Convert history for model if provided
    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const h of history) {
        if (h.role === 'user' || h.role === 'model') {
          contents.push({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.text || h.content || '' }],
          });
        }
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    let replyText = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });
      replyText = response.text || '';
    } catch (apiErr: any) {
      console.warn('AI API quota exceeded or error, using intelligent fallback:', apiErr?.message);
      const lower = message.toLowerCase();
      if (lower.includes('ডেলিভারি') || lower.includes('সময়') || lower.includes('দিন') || lower.includes('delivery')) {
        replyText = '📦 **ডেলিভারি সংক্রান্ত তথ্য:**\n- ঢাকার ভেতরে: ২৪ থেকে ৪৮ ঘণ্টা (ডেলিভারি চার্জ ৬০ টাকা)।\n- ঢাকার বাইরে: ৩ থেকে ৫ কার্যদিবস (ডেলিভারি চার্জ ১২০ টাকা)।\n\nআপনি যেকোনো সময় অর্ডার স্ট্যাটাস ট্র্যাকিং অপশন থেকে আপনার অর্ডারের বর্তমান অবস্থা দেখতে পারেন।';
      } else if (lower.includes('বিকাশ') || lower.includes('নগদ') || lower.includes('পেমেন্ট') || lower.includes('payment') || lower.includes('টাকা')) {
        replyText = '💳 **পেমেন্ট পদ্ধতিসমূহ:**\n- ক্যাশ অন ডেলিভারি (COD) সারা বাংলাদেশে উপলব্ধ।\n- মোবাইল ব্যাংকিং: বিকাশ, নগদ, রকেট ইত্যাদির মাধ্যমে পেমেন্ট করলে রয়েছে অতিরিক্ত ৫% ইনস্ট্যান্ট ক্যাশব্যাক অফার!';
      } else if (lower.includes('রিটার্ন') || lower.includes('ফেরত') || lower.includes('return') || lower.includes('বাতিল')) {
        replyText = '🔄 **রিটার্ন ও রিফান্ড নীতি:**\nপণ্য ক্ষতিগ্রস্ত, ত্রুটিপূর্ণ বা ভুল হলে আপনি ৭ দিনের মধ্যে ফ্রি রিটার্ন ও রিফান্ড সুবিধা পাবেন। প্রোফাইল > আমার অর্ডার > রিটার্ন সেকশন থেকে আবেদন করতে পারেন। ২৪-ঘণ্টার মধ্যে টাকা ফেরত দেওয়া হয়।';
      } else {
        replyText = `সহজবাই (ShohojBuy)-এর সহায়তা কেন্দ্রে আপনাকে স্বাগতম! আপনার প্রশ্নটি সম্পর্কে বিস্তারিত জানতে আমাদের ২৪/৭ হটলাইন **০৯৬১২-৩৪৫৬৭৮** এ কল করতে পারেন অথবা আমাদের কাস্টমার কেয়ার প্রতিনিধির সাথে সরাসরি যোগাযোগ করতে পারেন।`;
      }
    }

    return res.json({
      reply: replyText || 'দুঃখিত, কোনো উত্তর পাওয়া যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।',
      agent: 'ShohojBuy Help Assistant',
    });
  } catch (error: any) {
    console.error('Help Center AI Error:', error);
    return res.json({
      reply: 'সহজবাই (ShohojBuy)-এর সহায়তা কেন্দ্রে আপনাকে স্বাগতম! আপনার যেকোনো প্রয়োজনে আমাদের হটলাইন **০৯৬১২-৩৪৫৬৭৮** এ যোগাযোগ করতে পারেন।',
      agent: 'ShohojBuy Help Assistant',
    });
  }
});

// 2. LIVE CUSTOMER CARE AI SPECIALIST ENDPOINT
app.post('/api/ai/customer-care', async (req, res) => {
  try {
    const { message, history = [], userContext = {} } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const ai = getAI();
    const customerName = userContext.name || 'সম্মানিত গ্রাহক';

    const systemInstruction = `You are "ShohojBuy Customer Care AI Specialist (২৪/৭ কাস্টমার কেয়ার এআই বিশেষজ্ঞ)", a high-empathy, proactive, dedicated customer support representative for ShohojBuy.
The user talking to you is ${customerName}.

Your core responsibilities:
1. Listen with high empathy and provide immediate, practical solutions for customer issues.
2. Troubleshoot order status, delivery delays, wrong address correction, damage reports, return requests, and cancellation queries.
3. If an order needs cancellation or address change, guide the user step-by-step.
4. If a product arrived defective, reassure the customer immediately that ShohojBuy provides a 7-day 100% money-back guarantee and free home pickup.
5. If the user needs immediate human manager intervention, offer our direct Hotline: 09612-345678 or WhatsApp Live Chat: +880 1912-345678.
6. Always address the customer with respect in natural, professional Bengali (বাংলা).`;

    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const h of history) {
        if (h.role === 'user' || h.role === 'model') {
          contents.push({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.text || h.content || '' }],
          });
        }
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    let replyText = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.6,
        },
      });
      replyText = response.text || '';
    } catch (apiErr: any) {
      console.warn('Customer Care AI quota exceeded or error, using intelligent fallback:', apiErr?.message);
      replyText = `प्रिय ${customerName}, আপনার বিষয়টি আমরা গুরুত্বের সাথে নোট করেছি। আপনার অর্ডার বা ডেলিভারি সংক্রান্ত যেকোনো জরুরি সহায়তার জন্য আমাদের ২৪/৭ হটলাইন **০৯৬১২-৩৪৫৬৭৮** এ কল করুন অথবা ওয়াটসঅ্যাপে মেসেজ পাঠান। আমরা দ্রুত সমাধান নিশ্চিত করছি!`;
    }

    return res.json({
      reply: replyText || 'দুঃখিত, কোনো উত্তর পাওয়া যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।',
      agent: 'ShohojBuy Customer Care AI Specialist',
    });
  } catch (error: any) {
    console.error('Customer Care AI Error:', error);
    return res.json({
      reply: 'সম্মানিত গ্রাহক, আপনার যেকোনো প্রয়োজনে আমাদের হটলাইন **০৯৬১২-৩৪৫۶৭৮** এ যোগাযোগ করতে পারেন।',
      agent: 'ShohojBuy Customer Care AI Specialist',
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Vite Middleware for Dev and Static Serving for Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const viteModule = 'vite'; // Obscure import to prevent Vercel bundler from packing Vite
    const { createServer: createViteServer } = await import(viteModule);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ShohojBuy Full-Stack Server running on port ${PORT}`);
  });
}

// Only start the server locally or on standard containers, skip on Vercel serverless
if (!process.env.VERCEL) {
  startServer();
}

export default app;
