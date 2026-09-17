const fs = require('fs');

const filepath = 'src/screens/EditProfileScreen.tsx';
let content = fs.readFileSync(filepath, 'utf8').replace(/\r\n/g, '\n');

// Importar coisas necessarias
if (!content.includes('docUpdateRequested')) {
  // Add state to the component
  content = content.replace(
    "const [submittingPrice, setSubmittingPrice] = useState(false);",
    "const [submittingPrice, setSubmittingPrice] = useState(false);\n  const [submittingDocRequest, setSubmittingDocRequest] = useState(false);\n  const docUpdateStatus = user?.deliveryman?.docUpdateStatus || 'Nenhum';"
  );
}

const targetStart = `                {/* Documentação - LADO A LADO COM FOTOS GRANDES */}`;
const targetEnd = `                {/* Comprovativo de Morada */}`;

const startIndex = content.indexOf(targetStart);
const endIndex = content.indexOf(targetEnd);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `                {/* Documentação - LADO A LADO COM FOTOS GRANDES */}
                <View style={styles.section}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Documentação</Text>
                    {docUpdateStatus === 'Pendente' && (
                      <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                        <Text style={{ color: '#92400E', fontSize: 11, fontWeight: 'bold' }}>Aguardando Aprovação</Text>
                      </View>
                    )}
                    {docUpdateStatus === 'Aprovado' && (
                      <View style={{ backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                        <Text style={{ color: '#065F46', fontSize: 11, fontWeight: 'bold' }}>Edição Liberada</Text>
                      </View>
                    )}
                  </View>

                  {docUpdateStatus !== 'Aprovado' ? (
                    <View style={{ backgroundColor: '#F3F4F6', padding: 16, borderRadius: 8, alignItems: 'center' }}>
                      <Ionicons name="lock-closed-outline" size={32} color="#6B7280" style={{ marginBottom: 8 }} />
                      <Text style={{ color: '#4B5563', fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
                        Sua documentação já foi enviada. Para alterar os seus documentos de identificação ou da viatura, é necessário pedir permissão.
                      </Text>
                      <TouchableOpacity
                        style={{ backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, opacity: submittingDocRequest || docUpdateStatus === 'Pendente' ? 0.6 : 1 }}
                        disabled={submittingDocRequest || docUpdateStatus === 'Pendente'}
                        onPress={async () => {
                          setSubmittingDocRequest(true);
                          try {
                            const token = await (await import('@react-native-async-storage/async-storage')).default.getItem('authToken');
                            const res = await fetch(\`\${API_BASE_URL}/drivers/doc-update-request\`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
                            });
                            if (res.ok) {
                              if (updateUser) updateUser({ ...user, deliveryman: { ...user.deliveryman, docUpdateStatus: 'Pendente' } });
                              showMessage({ message: '✅ Pedido enviado!', description: 'Aguardando aprovação do admin para desbloquear os campos.', type: 'success', duration: 4000 });
                            } else {
                              const d = await res.json();
                              showMessage({ message: 'Erro', description: d.message || 'Erro ao pedir.', type: 'danger' });
                            }
                          } catch (e) {
                            showMessage({ message: 'Erro', description: 'Sem conexão.', type: 'danger' });
                          } finally {
                            setSubmittingDocRequest(false);
                          }
                        }}
                      >
                        {submittingDocRequest ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Solicitar Atualização</Text>}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <View style={{ backgroundColor: '#E0F2FE', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                        <Text style={{ color: '#0284C7', fontSize: 13, textAlign: 'center' }}>Você tem permissão para anexar os seus novos documentos. Ao salvar as alterações, a permissão será consumida e seus novos documentos serão submetidos para revisão.</Text>
                      </View>
                      
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Tipo de Documento</Text>
                        <View style={styles.radioGroup}>
                          {['BI', 'Passaporte', 'Cédula Pessoal'].map((docType) => (
                            <TouchableOpacity
                              key={docType}
                              style={styles.radioOption}
                              onPress={() => handleChange('document_type')(docType)}
                            >
                              <View style={[
                                styles.radioCircle,
                                values.document_type === docType && styles.radioCircleSelected
                              ]}>
                                {values.document_type === docType && (
                                  <View style={styles.radioInnerCircle} />
                                )}
                              </View>
                              <Text style={styles.radioText}>{docType}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      {/* Carta de Condução - LADO A LADO COM FOTOS GRANDES */}
                      <ImageUploadRow
                        leftTitle="Carta Condução (Frente)"
                        leftImage={licenseFrontImage}
                        onLeftPickImage={() => pickImage(setLicenseFrontImage)}
                        onLeftTakePhoto={() => takePhoto(setLicenseFrontImage)}
                        rightTitle="Carta Condução (Verso)"
                        rightImage={licenseBackImage}
                        onRightPickImage={() => pickImage(setLicenseBackImage)}
                        onRightTakePhoto={() => takePhoto(setLicenseBackImage)}
                        required
                      />

                      {/* Documento - LADO A LADO COM FOTOS GRANDES */}
                      <ImageUploadRow
                        leftTitle={\`\${values.document_type || 'BI'} (Frente)\`}
                        leftImage={documentFrontImage}
                        onLeftPickImage={() => pickImage(setDocumentFrontImage)}
                        onLeftTakePhoto={() => takePhoto(setDocumentFrontImage)}
                        rightTitle={\`\${values.document_type || 'BI'} (Verso)\`}
                        rightImage={documentBackImage}
                        onRightPickImage={() => pickImage(setDocumentBackImage)}
                        onRightTakePhoto={() => takePhoto(setDocumentBackImage)}
                        required
                      />
                    </>
                  )}
                </View>

                {/* Seguros e Inspeções - LADO A LADO COM FOTOS GRANDES */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Seguros e Inspeções</Text>
                  
                  {docUpdateStatus !== 'Aprovado' ? (
                     <View style={{ backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8 }}>
                       <Text style={{ color: '#6B7280', fontSize: 13, textAlign: 'center' }}>Desbloqueie a edição de documentos acima para alterar estes anexos.</Text>
                     </View>
                  ) : (
                    <ImageUploadRow
                      leftTitle="Inspeção do Veículo"
                      leftImage={vehicleInspectionImage}
                      onLeftPickImage={() => pickImage(setVehicleInspectionImage)}
                      onLeftTakePhoto={() => takePhoto(setVehicleInspectionImage)}
                      rightTitle="Seguro do Veículo"
                      rightImage={vehicleInsuranceImage}
                      onRightPickImage={() => pickImage(setVehicleInsuranceImage)}
                      onRightTakePhoto={() => takePhoto(setVehicleInsuranceImage)}
                    />
                  )}
                </View>

`;

  const finalContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  fs.writeFileSync(filepath, finalContent);
  console.log('Document block replaced successfully');
} else {
  console.log('Could not find document target sections in EditProfileScreen.tsx');
}
