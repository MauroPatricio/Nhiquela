const fs = require('fs');

let content = fs.readFileSync('screens/SignUp.jsx', 'utf8');

// 1. Import Linking
if (!content.includes('Linking')) {
    content = content.replace('  ActivityIndicator,\n} from \'react-native\';', '  ActivityIndicator,\n  Linking,\n} from \'react-native\';');
}

// 2. Add State
if (!content.includes('acceptedTerms')) {
    content = content.replace('const [pickingImage, setPickingImage] = useState(false);', 'const [pickingImage, setPickingImage] = useState(false);\n  const [acceptedTerms, setAcceptedTerms] = useState(false);');
}

// 3. Add Validation (Toast if !acceptedTerms)
// Let's modify the handleSubmit inside Formik, wait, Formik manages handleSubmit.
// Wait, the Button is disabled if !isValid or !acceptedTerms.
if (content.includes('disabled={state.loading || !isValid}')) {
    content = content.replace('disabled={state.loading || !isValid}', 'disabled={state.loading || !isValid || !acceptedTerms}');
}
if (content.includes("isValid ? PURPLE : 'red'")) {
    content = content.replace("isValid ? PURPLE : 'red'", "(isValid && acceptedTerms) ? PURPLE : 'red'");
}

// 4. Add Checkbox UI above the Button
const uiTarget = `                  {/* Botão */}
                  <Button`;
const uiReplacement = `                  {/* Checkbox Termos */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                    <TouchableOpacity 
                      onPress={() => setAcceptedTerms(!acceptedTerms)}
                      style={{
                        width: 24, height: 24, borderRadius: 6, borderWidth: 2, 
                        borderColor: acceptedTerms ? '#7F00FF' : '#D1D5DB', 
                        backgroundColor: acceptedTerms ? '#7F00FF' : 'transparent', 
                        justifyContent: 'center', alignItems: 'center', marginRight: 12 
                      }}
                    >
                      {acceptedTerms && <MaterialCommunityIcons name="check" size={16} color="#FFF" />}
                    </TouchableOpacity>
                    <Text style={{ flex: 1, fontSize: 13, color: '#4B5563' }}>
                        Li e aceito os <Text style={{ color: '#7F00FF', fontWeight: 'bold' }} onPress={() => Linking.openURL('https://marketplace.nhiquelaservicos.com/terms')}>Termos e Condições</Text> e a <Text style={{ color: '#7F00FF', fontWeight: 'bold' }} onPress={() => Linking.openURL('https://marketplace.nhiquelaservicos.com/privacy-policy')}>Política de Privacidade</Text>.
                    </Text>
                  </View>

                  {/* Botão */}
                  <Button`;
                  
if (content.includes(uiTarget)) {
    content = content.replace(uiTarget, uiReplacement);
}

fs.writeFileSync('screens/SignUp.jsx', content);
console.log('Client Registration Patched successfully!');
