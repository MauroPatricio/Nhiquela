const fs = require('fs');

const filepath = 'src/screens/EditProfileScreen.tsx';
let content = fs.readFileSync(filepath, 'utf8').replace(/\r\n/g, '\n');

const targetStart = `                {/* Comprovativo de Morada */}`;
const targetEnd = `              </>
            )}`;

const startIndex = content.indexOf(targetStart);
const endIndex = content.indexOf(targetEnd);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `                {/* Comprovativo de Morada */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Comprovativo de Morada</Text>
                  
                  {docUpdateStatus !== 'Aprovado' ? (
                     <View style={{ backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8 }}>
                       <Text style={{ color: '#6B7280', fontSize: 13, textAlign: 'center' }}>Desbloqueie a edição de documentos acima para alterar o comprovativo de morada.</Text>
                     </View>
                  ) : (
                    <>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Tipo de Comprovativo</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Ex: Fatura de luz, água, etc."
                          value={values.Proof_of_Addres_Reason}
                          onChangeText={handleChange('Proof_of_Addres_Reason')}
                          onBlur={handleBlur('Proof_of_Addres_Reason')}
                        />
                      </View>

                      <ImageUpload
                        title="Comprovativo de Morada"
                        image={proofOfAddressImage}
                        onPickImage={() => pickImage(setProofOfAddressImage)}
                        onTakePhoto={() => takePhoto(setProofOfAddressImage)}
                      />
                    </>
                  )}
                </View>
`;

  const finalContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  fs.writeFileSync(filepath, finalContent);
  console.log('Comprovativo block replaced successfully');
} else {
  console.log('Could not find Comprovativo target sections in EditProfileScreen.tsx');
}
