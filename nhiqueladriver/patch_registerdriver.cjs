const fs = require('fs');

let content = fs.readFileSync('src/screens/RegisterDriverScreen.tsx', 'utf8');

// 1. Import Linking
if (!content.includes('Linking')) {
    content = content.replace('    Modal\n} from "react-native";', '    Modal,\n    Linking\n} from "react-native";');
}

// 2. Add State
if (!content.includes('acceptedTerms')) {
    content = content.replace('const [colorOptions, setColorOptions] = useState<{ label: string, value: string }[]>([]);', 'const [colorOptions, setColorOptions] = useState<{ label: string, value: string }[]>([]);\n    const [acceptedTerms, setAcceptedTerms] = useState(false);');
}

// 3. Add Validation
if (content.includes('const validateStep2 = () => {')) {
    const valTarget = `        if (Object.keys(newErrors).length > 0) {
            setErrors(prev => ({ ...prev, ...newErrors }));
            showMessage({ message: "Preencha todos os dados e documentos do veículo", type: "warning" });
            return false;
        }`;
    const valReplacement = `        if (Object.keys(newErrors).length > 0) {
            setErrors(prev => ({ ...prev, ...newErrors }));
            showMessage({ message: "Preencha todos os dados e documentos do veículo", type: "warning" });
            return false;
        }
        if (!acceptedTerms) {
            showMessage({ message: "Tem de aceitar os Termos e Condições para avançar", type: "warning" });
            return false;
        }`;
    content = content.replace(valTarget, valReplacement);
}

// 4. Add Checkbox UI in renderStep2
if (content.includes('renderStep = () => {')) {
    const uiTarget = `                <View style={{ height: 20 }} />
            </View>
        );`;
    const uiReplacement = `                <View style={{ height: 20 }} />
                
                <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: '#F9FAFB', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' }}
                    onPress={() => setAcceptedTerms(!acceptedTerms)}
                >
                    <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: acceptedTerms ? '#7F00FF' : '#D1D5DB', backgroundColor: acceptedTerms ? '#7F00FF' : 'transparent', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                        {acceptedTerms && <Ionicons name="checkmark" size={16} color="#FFF" />}
                    </View>
                    <Text style={{ flex: 1, fontSize: 13, color: '#4B5563' }}>
                        Li e aceito os <Text style={{ color: '#7F00FF', fontWeight: 'bold' }} onPress={() => Linking.openURL('https://marketplace.nhiquelaservicos.com/terms')}>Termos e Condições</Text> e a <Text style={{ color: '#7F00FF', fontWeight: 'bold' }} onPress={() => Linking.openURL('https://marketplace.nhiquelaservicos.com/privacy-policy')}>Política de Privacidade</Text>.
                    </Text>
                </TouchableOpacity>

            </View>
        );`;
    
    // There are 3 renderSteps. We want to append to Step 2.
    // Let's just find the end of step 2 block. 
    // Let's replace the last 2 lines of the Step 2 return statement.
    content = content.replace(uiTarget, uiReplacement);
}

fs.writeFileSync('src/screens/RegisterDriverScreen.tsx', content);
console.log('Driver Registration Patched successfully!');
