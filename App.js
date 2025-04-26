import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Switch,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import * as Speech from 'expo-speech';
import axios from 'axios';
import { Audio } from 'expo-av';
import LottieView from 'lottie-react-native';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [useGoogleTTS, setUseGoogleTTS] = useState(false);
  const [loading, setLoading] = useState(false);
  const [darkTheme, setDarkTheme] = useState(false);
  const [recording, setRecording] = useState(null);
  const lottieRef = useRef();

  const sendMessage = async (textToSend = input) => {
    if (!textToSend.trim()) return;

    const userMessage = { sender: 'user', text: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await axios.post('https://krishi-mitra-nvxu.onrender.com/query', { query: textToSend });
      const botReply = res.data.text;
      const botMessage = { sender: 'bot', text: botReply };
      setMessages(prev => [...prev, botMessage]);

      if (voiceEnabled) {
        if (useGoogleTTS) {
          console.log("Using Google TTS (To be implemented)");
        } else {
          Speech.speak(botReply, {
            language: 'en',
            rate: 1.0,
          });
        }
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = { sender: 'bot', text: 'Something went wrong. Please try again.' };
      setMessages(prev => [...prev, errorMessage]);
    }

    setInput('');
    setLoading(false);
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    try {
      setRecording(undefined);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('Recorded file available at:', uri);

      const transcribedText = await transcribeAudio(uri);
      setInput(transcribedText);
      sendMessage(transcribedText);
    } catch (error) {
      console.error('Transcription error:', error);
      setInput('Could not transcribe the audio.');
    }
  };

  const toggleRecording = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const bgImage = darkTheme
    ? require('./assets/black.png')
    : require('./assets/white.jpg');

  return (
    <ImageBackground source={bgImage} style={styles.background} resizeMode="cover">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <Image source={require('./assets/krishi.png')} style={styles.logo} />
          <Text style={styles.title}>Krishi Mitra</Text>
        </View>

        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Voice</Text>
          <Switch
            value={voiceEnabled}
            onValueChange={() => setVoiceEnabled(prev => !prev)}
            thumbColor={voiceEnabled ? '#ffffff' : '#ccc'}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
          />
          <Text style={[styles.toggleLabel, { marginLeft: 20 }]}>Dark</Text>
          <Switch
            value={darkTheme}
            onValueChange={() => setDarkTheme(prev => !prev)}
            thumbColor={darkTheme ? '#ffffff' : '#ccc'}
            trackColor={{ false: '#767577', true: '#388e3c' }}
          />
{/* 
          <Switch
            value={useGoogleTTS}
            onValueChange={() => setUseGoogleTTS(prev => !prev)}
            thumbColor={useGoogleTTS ? '#ffffff' : '#ccc'}
            trackColor={{ false: '#767577', true: '#1e88e5' }}
          /> */}
        </View>

        <ScrollView style={styles.chatArea} contentContainerStyle={{ paddingBottom: 80 }}>
          {messages.map((msg, i) => (
            <View
              key={i}
              style={[
                styles.message,
                msg.sender === 'user' ? styles.userMsg : styles.botMsg,
              ]}
            >
              <View style={msg.sender === 'user' ? styles.tailRight : styles.tailLeft} />
              <Text style={styles.messageText}>{msg.text}</Text>
            </View>
          ))}

          {loading && (
            <View style={styles.typing}>
              <LottieView
                ref={lottieRef}
                source={require('./assets/typing.json')}
                autoPlay
                loop
                style={{ width: 60, height: 60 }}
              />
              <Text style={styles.typingText}>Typing...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputArea}>
          <TouchableOpacity style={styles.voiceBtn} onPress={toggleRecording}>
            <Image
              source={require('./assets/mic.png')}
              style={{ width: 24, height: 24, tintColor: recording ? 'red' : '#4CAF50' }}
            />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about a scheme..."
            placeholderTextColor="#999"
          />
          <TouchableOpacity onPress={() => sendMessage()} style={styles.sendBtn}>
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

// ✅ Real transcription logic with AssemblyAI
const transcribeAudio = async (uri) => {
  try {
    const apiKey = '51329d9916ce4771b99ad6e228f9ee2c'; // Replace with your AssemblyAI key

    const audio = {
      uri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    };

    const formData = new FormData();
    formData.append('file', audio);

    const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        authorization: apiKey,
      },
      body: audio,
    });

    const uploadData = await uploadRes.json();
    const audioUrl = uploadData.upload_url;

    const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ audio_url: audioUrl }),
    });

    const transcriptData = await transcriptRes.json();
    const transcriptId = transcriptData.id;

    // Polling for completion
    while (true) {
      const pollingRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { authorization: apiKey },
      });
      const pollingData = await pollingRes.json();

      if (pollingData.status === 'completed') {
        return pollingData.text;
      } else if (pollingData.status === 'error') {
        throw new Error('Transcription failed');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (err) {
    console.error('AssemblyAI Transcription Error:', err);
    throw err;
  }
};

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 18,
    paddingHorizontal: 20,
    backgroundColor: '#2e7d32cc',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  logo: { width: 42, height: 42, marginRight: 14, borderRadius: 10 },
  title: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'transparent',
    flexWrap: 'wrap',
  },
  toggleLabel: { fontSize: 14, color: '#1b5e20', fontWeight: '600' },
  chatArea: { flex: 1, paddingHorizontal: 16 },
  message: {
    maxWidth: '80%',
    padding: 14,
    marginVertical: 6,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  userMsg: {
    alignSelf: 'flex-end',
    backgroundColor: '#a5d6a7',
    borderTopRightRadius: 0,
  },
  botMsg: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffffcc',
    borderTopLeftRadius: 0,
    borderColor: '#81c784',
    borderWidth: 1,
  },
  tailRight: {
    position: 'absolute',
    right: -6,
    bottom: 0,
    width: 12,
    height: 12,
    backgroundColor: '#a5d6a7',
    transform: [{ rotate: '45deg' }],
    borderBottomRightRadius: 6,
  },
  tailLeft: {
    position: 'absolute',
    left: -6,
    bottom: 0,
    width: 12,
    height: 12,
    backgroundColor: '#ffffffcc',
    transform: [{ rotate: '45deg' }],
    borderBottomLeftRadius: 6,
  },
  messageText: { fontSize: 16, color: '#333', lineHeight: 22 },
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  typingText: {
    fontSize: 14,
    color: '#888',
    marginLeft: 10,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  voiceBtn: { padding: 10 },
  input: {
    flex: 1,
    height: 40,
    marginLeft: 10,
    paddingLeft: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    fontSize: 16,
  },
  sendBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#388e3c',
    borderRadius: 20,
    marginLeft: 12,
  },
  sendBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
