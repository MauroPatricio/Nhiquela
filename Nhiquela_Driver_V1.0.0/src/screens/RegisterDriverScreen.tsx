import { showMessage } from "react-native-flash-message";
import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    Alert,
    Animated,
    Dimensions,
    StatusBar,
    ActivityIndicator
} from "react-native";
import * as ImagePicker from "expo-image-picker";
//@ts-ignore
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../styles/colors";
import SelectField from "../components/SelectField";
import { registerDriver, uploadLocalFile } from "../services/deliveryService";
import { useLoadingContext } from '../context/LoadingContext';
import { SafeAreaView } from "react-native-safe-area-context";

interface DriverForm {
    photo: string;
    name: string;
    phoneNumber: string;
    email: string;
    password: string;
    transport_type: string;
    transport_color: string;
    transport_registration: string;
    vihicle_picture: string;
    vihicle_inspection: string;
    vihicle_Insurance: string;
    license_front: string;
    license_back: string;
    document_type: string;
    document_front: string;
    document_back: string;
    Proof_of_Address: string;
}

const colorOptions = [
    { label: "Branco", value: "branco" },
    { label: "Preto", value: "preto" },
    { label: "Prata", value: "prata" },
    { label: "Cinza", value: "cinza" },
    { label: "Azul", value: "azul" },
    { label: "Vermelho", value: "vermelho" },
    { label: "Outra", value: "outra" },
];

export default function RegisterDriverScreen({ navigation }: any) {
    const [step, setStep] = useState(0);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    
    const [form, setForm] = useState<DriverForm>({
        photo: "", name: "", phoneNumber: "", email: "", password: "",
        transport_type: "", transport_color: "", transport_registration: "", vihicle_picture: "",
        vihicle_inspection: "", vihicle_Insurance: "", license_front: "", license_back: "",
        document_type: "bi", document_front: "", document_back: "", Proof_of_Address: "",
    });

    const [uploadingField, setUploadingField] = useState<string | null>(null);
    const { showLoading, hideLoading, showProcessing } = useLoadingContext();
    const [showPassword, setShowPassword] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (field: keyof DriverForm, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    // 🚀 NOVO UPLOAD IMEDIATO
    const pickImage = async (field: keyof DriverForm) => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showMessage({ message: 'Permissão necessária', type: "info" });
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
        });

        if (!result.canceled && result.assets[0].uri) {
            setUploadingField(field);
            try {
                // Upload direto para o backend local ao invés de Base64
                const uploadedUrl = await uploadLocalFile(result.assets[0].uri);
                handleChange(field, uploadedUrl);
                showMessage({ message: 'Imagem carregada com sucesso!', type: "success" });
            } catch (error) {
                showMessage({ message: 'Erro no upload', description: 'Tente novamente.', type: "danger" });
            } finally {
                setUploadingField(null);
            }
        }
    };

    const validateStep0 = () => {
        const newErrors: Record<string, string> = {};
        if (!form.photo) newErrors.photo = 'Obrigatório';
        if (!form.name) newErrors.name = 'Obrigatório';
        if (form.phoneNumber.length < 9) newErrors.phoneNumber = 'Número muito curto';
        if (!form.email) newErrors.email = 'Obrigatório';
        if (form.password.length < 6) newErrors.password = 'Mínimo 6 caracteres';
        if (!confirmPassword) newErrors.confirmPassword = 'Obrigatório';
        if (form.password && confirmPassword && form.password !== confirmPassword) {
            newErrors.password = 'Senhas não coincidem';
            newErrors.confirmPassword = 'Senhas não coincidem';
        }
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            showMessage({ message: "Preencha todos os campos obrigatórios corretamente", type: "warning" });
            return false;
        }
        setErrors({});
        return true;
    };

    const validateStep1 = () => {
        const newErrors: Record<string, string> = {};
        if (!form.transport_type) newErrors.transport_type = 'Obrigatório';
        if (!form.transport_color) newErrors.transport_color = 'Obrigatório';
        if (!form.transport_registration) newErrors.transport_registration = 'Obrigatório';
        if (!form.vihicle_picture) newErrors.vihicle_picture = 'Obrigatório';
        if (Object.keys(newErrors).length > 0) {
            setErrors(prev => ({ ...prev, ...newErrors }));
            showMessage({ message: "Preencha todos os campos obrigatórios do veículo", type: "warning" });
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        const newErrors: Record<string, string> = {};
        if (!form.document_front) newErrors.document_front = 'Obrigatório';
        if (!form.document_back) newErrors.document_back = 'Obrigatório';
        if (!form.license_front) newErrors.license_front = 'Obrigatório';
        if (!form.license_back) newErrors.license_back = 'Obrigatório';
        if (Object.keys(newErrors).length > 0) {
            setErrors(prev => ({ ...prev, ...newErrors }));
            showMessage({ message: "As fotos dos documentos são obrigatórias", type: "warning" });
            return false;
        }
        return true;
    };

    const handleNext = () => {
        if (step === 0 && !validateStep0()) return;
        if (step === 1 && !validateStep1()) return;

        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true })
        ]).start();
        
        setTimeout(() => setStep(step + 1), 200);
    };

    const handleBack = () => {
        if (step > 0) setStep(step - 1);
        else navigation.replace('Login');
    };

    const handleSubmit = async () => {
        if (!validateStep2()) return;
        
        setErrors({});
        showLoading('A submeter candidatura...');
        try {
            const finalData = { ...form, isDeliveryMan: true };
            
            showProcessing('Finalizando...');
            await registerDriver(finalData);
            
            hideLoading();
            Alert.alert(
                "✅ Sucesso",
                "Cadastro enviado para validação! Iremos analisar e responder em breve.",
                [{ text: "OK", onPress: () => navigation.replace('Login') }]
            );
        } catch (error: any) {
            hideLoading();
            let errorMessage = "Erro ao cadastrar motorista. Tente novamente.";
            if (error.isAxiosError && error.response) {
                errorMessage = error.response.data?.message || errorMessage;
            }
            Alert.alert("❌ Erro", errorMessage);
        }
    };

    const renderInput = (label: string, field: keyof DriverForm, icon: string, props?: any) => (
        <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={[styles.inputWrapper, errors[field] && { borderColor: '#FF0000' }] }>
                <Ionicons name={icon as any} size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    value={form[field]}
                    onChangeText={(v) => handleChange(field, v)}
                    {...props}
                />
            </View>
        </View>
    );

    const renderImageUpload = (label: string, field: keyof DriverForm, icon: string) => (
        <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{label}</Text>
            <TouchableOpacity 
                style={[styles.uploadBox, errors[field] && { borderColor: '#FF0000' }]} 
                onPress={() => pickImage(field)}
                disabled={uploadingField === field}
            >
                {uploadingField === field ? (
                    <ActivityIndicator color="#7F00FF" />
                ) : form[field] ? (
                    <Image source={{ uri: `http://127.0.0.1:5000${form[field]}` }} style={styles.previewImage} />
                ) : (
                    <>
                        <MaterialCommunityIcons name={icon as any} size={32} color="#9CA3AF" />
                        <Text style={styles.uploadText}>Toque para adicionar foto</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Novo Motorista</Text>
                <View style={{width: 24}} />
            </View>

            <View style={styles.stepperContainer}>
                <View style={styles.stepIndicator}>
                    <View style={[styles.stepDot, step >= 0 && styles.stepDotActive]} />
                    <View style={[styles.stepLine, step >= 1 && styles.stepLineActive]} />
                    <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
                    <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
                    <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
                </View>
                <Text style={styles.stepTitle}>
                    {step === 0 ? "Passo 1: Dados Pessoais" : step === 1 ? "Passo 2: O Veículo" : "Passo 3: Documentação"}
                </Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
                    
                    {step === 0 && (
                        <View style={styles.stepContent}>
                            <View style={{alignItems: 'center', marginBottom: 20}}>
                                <TouchableOpacity 
                                    style={[styles.profileUpload, errors.photo && { borderColor: '#FF0000' }]} 
                                    onPress={() => pickImage('photo')}
                                    disabled={uploadingField === 'photo'}
                                >
                                    {uploadingField === 'photo' ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : form.photo ? (
                                        <Image source={{ uri: `http://127.0.0.1:5000${form.photo}` }} style={styles.profileImage} />
                                    ) : (
                                        <Ionicons name="camera" size={32} color="#FFF" />
                                    )}
                                </TouchableOpacity>
                                <Text style={styles.profileText}>Foto de Perfil *</Text>
                            </View>

                            {renderInput("Nome Completo *", "name", "person-outline", { placeholder: "Ex: João Silva" })}
                            {renderInput("Telefone *", "phoneNumber", "call-outline", { placeholder: "84...", keyboardType: "phone-pad", maxLength: 9 })}
                            {renderInput("Email *", "email", "mail-outline", { placeholder: "email@exemplo.com", keyboardType: "email-address", autoCapitalize: "none" })}
                            {/* Password with visibility toggle */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Senha (mín 6) *</Text>
                                <View style={[styles.inputWrapper, errors.password && { borderColor: '#FF0000' }] }>
                                    <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={form.password}
                                        onChangeText={(v) => handleChange('password', v)}
                                        placeholder="******"
                                        secureTextEntry={!showPassword}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                                        <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#6B7280" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            {/* Confirm Password */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Confirmar Senha *</Text>
                                <View style={[styles.inputWrapper, errors.confirmPassword && { borderColor: '#FF0000' }] }>
                                    <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={confirmPassword}
                                        onChangeText={(v) => { setConfirmPassword(v); if(errors.confirmPassword) setErrors(prev => ({...prev, confirmPassword: ''})) }}
                                        placeholder="******"
                                        secureTextEntry={!showPassword}
                                    />
                                </View>
                            </View>
                        </View>
                    )}

                    {step === 1 && (
                        <View style={styles.stepContent}>
                            <SelectField
                                label="Tipo de Transporte *"
                                field="transport_type"
                                value={form.transport_type}
                                onChange={(f, v) => handleChange('transport_type', v)}
                                options={[
                                    { label: "Motocicleta", value: "motocicleta" },
                                    { label: "Carro", value: "carro" },
                                    { label: "Caminhão", value: "caminhao" },
                                ]}
                            />
                            <SelectField
                                label="Cor do Veículo *"
                                field="transport_color"
                                value={form.transport_color}
                                options={colorOptions}
                                onChange={(f, v) => handleChange('transport_color', v)}
                            />
                            {renderInput("Matrícula/Placa *", "transport_registration", "car-outline", { placeholder: "AAA-111-MC", autoCapitalize: "characters" })}
                            {renderImageUpload("Foto do Veículo *", "vihicle_picture", "car-hatchback")}
                        </View>
                    )}

                    {step === 2 && (
                        <View style={styles.stepContent}>
                            {renderImageUpload("Carta de Condução (Frente) *", "license_front", "card-account-details-outline")}
                            {renderImageUpload("Carta de Condução (Verso) *", "license_back", "card-account-details-outline")}
                            {renderImageUpload("BI ou Passaporte (Frente) *", "document_front", "passport")}
                            {renderImageUpload("BI ou Passaporte (Verso) *", "document_back", "passport")}
                            {renderImageUpload("Comprovativo de Morada (Opcional)", "Proof_of_Address", "home-map-marker")}
                        </View>
                    )}

                </Animated.View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.primaryButton} onPress={step === 2 ? handleSubmit : handleNext}>
                    <Text style={styles.primaryButtonText}>{step === 2 ? "Concluir Cadastro" : "Avançar"}</Text>
                    {step < 2 && <Ionicons name="arrow-forward" size={20} color="#FFF" style={{marginLeft: 8}} />}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#FFF" },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
    backButton: { padding: 5 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    stepperContainer: { paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    stepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E5E7EB' },
    stepDotActive: { backgroundColor: '#7F00FF' },
    stepLine: { width: 60, height: 2, backgroundColor: '#E5E7EB', marginHorizontal: 4 },
    stepLineActive: { backgroundColor: '#7F00FF' },
    stepTitle: { textAlign: 'center', fontSize: 16, fontWeight: '600', color: '#374151' },
    scrollContent: { padding: 20, paddingBottom: 40 },
    stepContent: { flex: 1 },
    profileUpload: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 3, borderColor: '#7F00FF' },
    profileImage: { width: '100%', height: '100%' },
    profileText: { marginTop: 8, fontSize: 14, color: '#6B7280', fontWeight: '500' },
    inputContainer: { marginBottom: 20 },
    inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, height: 56, paddingHorizontal: 16 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, color: '#111827' },
    uploadBox: { height: 120, backgroundColor: '#F9FAFB', borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed', borderRadius: 16, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    uploadText: { marginTop: 8, fontSize: 14, color: '#9CA3AF' },
    previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#FFF' },
    primaryButton: { backgroundColor: '#7F00FF', borderRadius: 16, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#7F00FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    eyeButton: { marginLeft: 12 }
});
