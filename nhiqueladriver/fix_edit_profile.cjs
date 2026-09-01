const fs = require('fs');

const filepath = 'src/screens/EditProfileScreen.tsx';
let content = fs.readFileSync(filepath, 'utf8').replace(/\r\n/g, '\n');

// Import Picker if not present
if (!content.includes('@react-native-picker/picker')) {
  content = content.replace(
    "import {",
    "import { Picker } from '@react-native-picker/picker';\nimport {"
  );
}

const targetStart = `              {/* Foto de Perfil GRANDE */}`;
const targetEnd = `                  {/* Foto do Veículo GRANDE */}`;

const startIndex = content.indexOf(targetStart);
const endIndex = content.indexOf(targetEnd);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `              {/* Foto de Perfil GRANDE */}
              <ImageUpload
                title="Foto de Perfil"
                image={profileImage}
                onPickImage={() => pickImage(setProfileImage)}
                onTakePhoto={() => takePhoto(setProfileImage)}
              />
            </View>

            {/* ✅ SECÇÃO APENAS PARA MOTORISTAS */}
            {user?.isDeliveryMan && (
              <>
                {/* Informações do Veículo */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Informações do Veículo</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Tipo de Veículo</Text>
                    <View style={[styles.input, { backgroundColor: '#f3f4f6', justifyContent: 'center' }]}>
                      <Text style={{ color: '#6b7280' }}>{values.transport_type || 'N/A'}</Text>
                    </View>
                  </View>

                  {/* Preço Personalizado */}
                  <View style={styles.inputGroup}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingVertical: 10, paddingHorizontal: 15, backgroundColor: '#f9f9f9', borderRadius: 8 }}>
                      <Text style={[styles.label, { marginBottom: 0 }]}>Definir o meu próprio preço</Text>
                      <Switch
                        value={allowCustomPrice}
                        onValueChange={async (val) => {
                          setAllowCustomPrice(val);
                          try {
                            const token = await (await import('@react-native-async-storage/async-storage')).default.getItem('authToken');
                            await fetch(\`\${API_BASE_URL}/drivers/price-request/toggle\`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
                              body: JSON.stringify({ allowCustomPrice: val }),
                            });
                            if (updateUser) updateUser({ ...user, deliveryman: { ...user.deliveryman, allowCustomPrice: val } });
                          } catch (e) { /* ignore */ }
                        }}
                        trackColor={{ false: '#E5E7EB', true: COLORS.primary }}
                        thumbColor="#fff"
                      />
                    </View>

                    {allowCustomPrice ? (
                      <View>
                        {/* Estado do pedido */}
                        {priceStatus === 'Pendente' && (
                          <View style={{ backgroundColor: '#FEF3C7', padding: 10, borderRadius: 8, marginBottom: 8 }}>
                            <Text style={{ color: '#92400E', fontWeight: '600', fontSize: 13 }}>🕐 Aguardando aprovação: {pendingPrice} MT</Text>
                          </View>
                        )}
                        {priceStatus === 'Aprovado' && (
                          <View style={{ backgroundColor: '#D1FAE5', padding: 10, borderRadius: 8, marginBottom: 8 }}>
                            <Text style={{ color: '#065F46', fontWeight: '600', fontSize: 13 }}>✅ Preço aprovado: {user?.deliveryman?.customPrice} MT</Text>
                          </View>
                        )}
                        {priceStatus === 'Rejeitado' && (
                          <View style={{ backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8, marginBottom: 8 }}>
                            <Text style={{ color: '#991B1B', fontWeight: '600', fontSize: 13 }}>❌ Rejeitado</Text>
                            {rejectionReason ? <Text style={{ color: '#7F1D1D', fontSize: 12, marginTop: 2 }}>Motivo: {rejectionReason}</Text> : null}
                          </View>
                        )}

                        {/* Input + botão de submissão */}
                        <Text style={[styles.label, { marginBottom: 6 }]}>Novo Preço (MT)</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TextInput
                            style={[styles.input, { flex: 1 }]}
                            placeholder="Ex: 500"
                            keyboardType="numeric"
                            value={customPriceInput}
                            onChangeText={setCustomPriceInput}
                            editable={priceStatus !== 'Pendente'}
                          />
                          <TouchableOpacity
                            style={{
                              backgroundColor: COLORS.primary,
                              borderRadius: 8,
                              paddingHorizontal: 16,
                              justifyContent: 'center',
                              opacity: submittingPrice || !customPriceInput || priceStatus === 'Pendente' ? 0.5 : 1,
                            }}
                            disabled={submittingPrice || !customPriceInput || priceStatus === 'Pendente'}
                            onPress={async () => {
                              const price = parseFloat(customPriceInput);
                              if (!price || price <= 0) return;
                              setSubmittingPrice(true);
                              try {
                                const token = await (await import('@react-native-async-storage/async-storage')).default.getItem('authToken');
                                const res = await fetch(\`\${API_BASE_URL}/drivers/price-request\`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
                                  body: JSON.stringify({ requestedPrice: price }),
                                });
                                if (res.ok) {
                                  if (updateUser) updateUser({ ...user, deliveryman: { ...user.deliveryman, priceRequestStatus: 'Pendente', pendingCustomPrice: price } });
                                  showMessage({ message: '✅ Pedido enviado!', description: 'Aguardando aprovação do admin.', type: 'success', duration: 3500 });
                                } else {
                                  const d = await res.json();
                                  showMessage({ message: 'Erro', description: d.message || 'Erro ao submeter pedido.', type: 'danger', duration: 3500 });
                                }
                              } catch (e) {
                                showMessage({ message: 'Erro', description: 'Sem conexão.', type: 'danger', duration: 3000 });
                              } finally {
                                setSubmittingPrice(false);
                              }
                            }}
                          >
                            {submittingPrice
                              ? <ActivityIndicator size="small" color="#fff" />
                              : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Solicitar</Text>}
                          </TouchableOpacity>
                        </View>
                        <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>O preço fica ativo após aprovação do administrador.</Text>
                      </View>
                    ) : (
                      <View style={{ backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8 }}>
                        <Text style={{ color: '#6B7280', fontSize: 13 }}>💡 Preço calculado automaticamente pela plataforma com base na distância e tarifas vigentes.</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Cor</Text>
                    <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, overflow: 'hidden' }}>
                      <Picker
                        selectedValue={values.transport_color}
                        onValueChange={handleChange('transport_color')}
                        style={{ height: 50, width: '100%' }}
                      >
                        <Picker.Item label="Selecione a cor" value="" />
                        <Picker.Item label="Branco" value="Branco" />
                        <Picker.Item label="Preto" value="Preto" />
                        <Picker.Item label="Cinza" value="Cinza" />
                        <Picker.Item label="Prata" value="Prata" />
                        <Picker.Item label="Vermelho" value="Vermelho" />
                        <Picker.Item label="Azul" value="Azul" />
                        <Picker.Item label="Amarelo" value="Amarelo" />
                        <Picker.Item label="Verde" value="Verde" />
                        <Picker.Item label="Laranja" value="Laranja" />
                      </Picker>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Matrícula</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: AB-123-CD"
                      value={values.transport_registration}
                      onChangeText={handleChange('transport_registration')}
                      onBlur={handleBlur('transport_registration')}
                    />
                  </View>

`;

  const finalContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  fs.writeFileSync(filepath, finalContent);
  console.log('EditProfileScreen.tsx syntax fixed successfully');
} else {
  console.log('Could not find target sections in EditProfileScreen.tsx');
}
