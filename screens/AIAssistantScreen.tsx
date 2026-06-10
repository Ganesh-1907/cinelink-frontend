import React, {useState, useRef, useEffect} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, SafeAreaView, StatusBar,
} from 'react-native';

const GEMINI_API_KEY = 'AIzaSyDGlDTjjUg_x5rtdN98nTqYnKY_DILnvFA';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_CONTEXT = `You are CineLink AI — an expert assistant for Indian cinema creators.
You help actors, directors, and short film makers with:
- Audition tips and preparation
- Script writing and feedback
- Film production advice
- Crew hiring guidance
- Contest strategies
- Career growth in Indian cinema (Bollywood, Tollywood, Kollywood, etc.)
Keep responses concise, practical, and encouraging. Use simple language.`;

/* ── safe error message helper ── */
const getErrorMessage = (e: unknown): string => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Something went wrong. Please try again.';
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
};

const SUGGESTED_PROMPTS = [
  '🎭 How to prepare for an audition?',
  '🎬 Tips for directing a short film',
  '📝 Help me write a character bio',
  '🏆 How to win a film contest?',
];

export default function AIAssistantScreen() {
  const [messages, setMessages] = useState<Message[]>([{
    id: '0',
    role: 'assistant',
    text: "Namaste! 🎬 I'm CineLink AI, your personal cinema assistant. Ask me anything about auditions, filmmaking, scripts, or growing your career in Indian cinema!",
    timestamp: new Date(),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 1) {
      setTimeout(() => flatListRef.current?.scrollToEnd({animated: true}), 100);
    }
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    setInput('');

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages
        .filter(m => m.id !== '0')
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{text: m.text}],
        }));

      const body = {
        contents: [
          {role: 'user', parts: [{text: SYSTEM_CONTEXT}]},
          {role: 'model', parts: [{text: 'Understood! I am CineLink AI, ready to help.'}]},
          ...history,
          {role: 'user', parts: [{text: userText}]},
        ],
        generationConfig: {temperature: 0.7, maxOutputTokens: 600},
      };

      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        const errMsg =
          data?.error?.message ||
          data?.message ||
          `API Error ${response.status}`;
        throw new Error(errMsg);
      }

      const aiText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        'Sorry, I could not generate a response. Please try again.';

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: aiText.trim(),
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMsg]);

    } catch (e) {
      /* FIX: use getErrorMessage helper — no .message property access */
      const errorMsg = getErrorMessage(e);
      console.log('AI error:', errorMsg);

      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: `⚠️ ${errorMsg}\n\nPlease check your internet connection and try again.`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({item}: {item: Message}) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {!isUser && <Text style={styles.aiLabel}>🤖 CineLink AI</Text>}
        <Text style={[styles.messageText, isUser && styles.userText]}>
          {item.text}
        </Text>
        <Text style={[styles.timestamp, isUser && styles.userTimestamp]}>
          {item.timestamp.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🤖</Text>
        <View>
          <Text style={styles.headerTitle}>CineLink AI</Text>
          <Text style={styles.headerSubtitle}>Your Cinema Assistant</Text>
        </View>
        <View style={styles.onlineDot} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}>

        {/* MESSAGES */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loading ? (
              <View style={styles.typingIndicator}>
                <ActivityIndicator size="small" color="#C9956C" />
                <Text style={styles.typingText}>CineLink AI is thinking...</Text>
              </View>
            ) : null
          }
        />

        {/* SUGGESTED PROMPTS */}
        {messages.length === 1 && (
          <View style={styles.suggestedContainer}>
            <Text style={styles.suggestedLabel}>Quick questions:</Text>
            <View style={styles.suggestedRow}>
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.suggestedChip}
                  onPress={() => sendMessage(prompt)}>
                  <Text style={styles.suggestedChipText}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* INPUT */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about auditions, films, scripts..."
            placeholderTextColor="#A09080"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!input.trim() || loading) && styles.sendBtnDisabled,
            ]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || loading}>
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  container: {flex: 1, backgroundColor: '#0A0A0A'},

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#1C1C1C',
    borderBottomWidth: 1, borderBottomColor: '#2A2A2A',
    gap: 12,
  },
  headerIcon: {fontSize: 28},
  headerTitle: {color: '#FFFFFF', fontSize: 17, fontWeight: '700'},
  headerSubtitle: {color: '#A09080', fontSize: 12},
  onlineDot: {
    marginLeft: 'auto', width: 10, height: 10,
    borderRadius: 5, backgroundColor: '#22C55E',
  },

  messageList: {paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 8},

  messageBubble: {
    maxWidth: '82%', marginBottom: 12, borderRadius: 16, padding: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#C9956C',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1C1C1C',
    borderBottomLeftRadius: 4,
  },

  aiLabel: {
    color: '#C9956C', fontSize: 11, fontWeight: '700',
    marginBottom: 4, letterSpacing: 0.5,
  },
  messageText: {color: '#A09080', fontSize: 14, lineHeight: 20},
  userText: {color: '#FFFFFF'},

  timestamp: {
    color: '#A09080', fontSize: 10,
    marginTop: 6, alignSelf: 'flex-end',
  },
  userTimestamp: {color: 'rgba(255,255,255,0.6)'},

  typingIndicator: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 8, gap: 8,
  },
  typingText: {color: '#A09080', fontSize: 13, fontStyle: 'italic'},

  suggestedContainer: {paddingHorizontal: 16, paddingBottom: 8},
  suggestedLabel: {color: '#A09080', fontSize: 12, marginBottom: 8},
  suggestedRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  suggestedChip: {
    backgroundColor: '#1C1C1C', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: '#C9956C',
  },
  suggestedChipText: {color: '#C9956C', fontSize: 12},

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#1C1C1C',
    borderTopWidth: 1, borderTopColor: '#2A2A2A',
    gap: 8,
  },
  input: {
    flex: 1, backgroundColor: '#2A2A2A', borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 10,
    color: '#FFFFFF', fontSize: 14, maxHeight: 100,
    borderWidth: 1, borderColor: '#333333',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#C9956C',
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: {backgroundColor: '#2A2A2A'},
  sendIcon: {color: '#FFFFFF', fontSize: 16, marginLeft: 2},
});