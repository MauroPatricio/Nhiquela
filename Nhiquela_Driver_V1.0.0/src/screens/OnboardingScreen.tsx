// screens/OnboardingScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions,
  StatusBar,
  Animated,
  ScrollView,
  Easing
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get('window');

// ✅ REMOVIDO: useNavigation e NativeStackNavigationProp
// ✅ ADICIONADO: Props para callback
interface OnboardingScreenProps {
  onOnboardingComplete: () => void;
}

export default function OnboardingScreen({ onOnboardingComplete }: OnboardingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(1));
  
  // Animações
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const particleAnim = useRef(new Animated.Value(0)).current;

  const steps = [
    {
      id: 1,
      icon: "🚗",
      title: "Bem-vindo ao\nNhiquela Driver",
      subtitle: "Excelência em cada jornada",
      description: "Tecnologia avançada, suporte 24/7 e as melhores oportunidades para motoristas profissionais.",
      gradient: ['#667eea', '#764ba2'],
      accentColor: '#667eea',
      buttonText: "Continuar",
      particles: ["✨", "🌟", "💫"]
    },
    {
      id: 2,
      icon: "🛡️",
      title: "Segurança &\nPrivacidade",
      subtitle: "Seus dados protegidos",
      description: `• Criptografia avançada em todos os dados\n• Controle total sobre suas informações\n• Auditorias regulares de segurança\n• Autenticação multifator\n• Transações 100% seguras\n• Localização apenas durante corridas\n• Exclusão de dados a qualquer momento`,
      gradient: ['#f093fb', '#f5576c'],
      accentColor: '#f5576c',
      buttonText: "Aceitar Políticas",
      particles: ["🔒", "🔑", "📱"]
    },
    {
      id: 3,
      icon: "💎",
      title: "Experiência\nPremium",
      subtitle: "Vantagens exclusivas",
      description: `• Ganhe até 40% mais com precificação dinâmica\n• Suporte dedicado \n• Pagamentos instantâneos\n• Corridas em zonas exclusivas\n• Programa de benefícios\n• Dashboard em tempo real\n• Treinamentos exclusivos`,
      gradient: ['#4facfe', '#00f2fe'],
      accentColor: '#4facfe',
      buttonText: "Iniciar Sessão",
      particles: ["💎", "⚡", "🚀"]
    }
  ];

  // Animação de partículas flutuantes
  useEffect(() => {
    const animateParticles = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(particleAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(particleAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animateParticles();
  }, []);

  // Animação de transição entre steps
  useEffect(() => {
    // Reset animações
    slideAnim.setValue(50);
    scaleAnim.setValue(0.8);
    rotateAnim.setValue(0);

    // Animação de entrada
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep]);

  const animateTransition = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();

    setTimeout(callback, 200);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      animateTransition(() => setCurrentStep(currentStep + 1));
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      animateTransition(() => setCurrentStep(currentStep - 1));
    }
  };

  const handleFinish = async () => {
    try {
      console.log("✅ Finalizando onboarding...");
      await AsyncStorage.setItem("hasAcceptedPolicies", "true");
      console.log("✅ Políticas salvas, chamando callback...");
      
      // ✅ CORREÇÃO: Chame o callback em vez de navegar manualmente
      onOnboardingComplete();
      
    } catch (error) {
      console.error("❌ Erro ao finalizar onboarding:", error);
    }
  };

  const currentStepData = steps[currentStep];

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const particleOpacity = particleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <LinearGradient
        colors={currentStepData.gradient as [string, string]}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Partículas animadas de fundo */}
        <View style={styles.particlesContainer}>
          {[1, 2, 3, 4, 5].map((item) => (
            <Animated.Text
              key={item}
              style={[
                styles.particle,
                {
                  left: `${item * 20}%`,
                  top: `${(item * 15) % 80}%`,
                  opacity: particleOpacity,
                  transform: [
                    {
                      translateY: particleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -20],
                      }),
                    },
                  ],
                },
              ]}
            >
              {currentStepData.particles[item % 3]}
            </Animated.Text>
          ))}
        </View>

        {/* Header com indicador de progresso */}
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            {steps.map((_, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.progressDot,
                  index <= currentStep && [
                    styles.progressDotActive,
                    { backgroundColor: currentStepData.accentColor }
                  ],
                  index === currentStep && {
                    transform: [{ scale: scaleAnim }]
                  }
                ]}
              />
            ))}
          </View>
          
          {currentStep > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>‹</Text>
            </TouchableOpacity>
          )}
        </View>

        <Animated.View 
          style={[
            styles.content, 
            { 
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          {/* Ícone com animação */}
          <Animated.View 
            style={[
              styles.iconContainer,
              {
                transform: [
                  { 
                    rotate: rotateInterpolate 
                  }
                ]
              }
            ]}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.iconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.icon}>{currentStepData.icon}</Text>
            </LinearGradient>
          </Animated.View>

          {/* Título e Subtítulo */}
          <Text style={styles.title}>{currentStepData.title}</Text>
          <Text style={styles.subtitle}>{currentStepData.subtitle}</Text>

          {/* Descrição */}
          <ScrollView 
            style={styles.descriptionContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.description}>
              {currentStepData.description}
            </Text>
          </ScrollView>

          {/* Botão Principal */}
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFF'] as [string, string]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[styles.primaryButtonText, { color: currentStepData.accentColor }]}>
                {currentStepData.buttonText}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Pular (apenas nos primeiros steps) */}
          {currentStep < steps.length - 1 && (
            <TouchableOpacity 
              style={styles.skipButton}
              onPress={handleFinish}
            >
              <Text style={styles.skipButtonText}>Pular Introdução</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Footer com marca */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Nhiquela Driver ® 2025</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    paddingTop: (StatusBar.currentHeight || 0) + 20,
    paddingBottom: 30,
  },
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  particle: {
    position: 'absolute',
    fontSize: 24,
    opacity: 0.3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    marginBottom: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 6,
  },
  progressDotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '300',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  descriptionContainer: {
    flex: 1,
    width: '100%',
    marginBottom: 40,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '400',
  },
  primaryButton: {
    width: '100%',
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  skipButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
  },
  skipButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
});