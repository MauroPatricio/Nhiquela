const fs = require('fs');

const filepath = 'src/screens/EditProfileScreen.tsx';
let content = fs.readFileSync(filepath, 'utf8').replace(/\r\n/g, '\n');

const targetStart = `                  {/* Foto do Veículo GRANDE */}`;
const targetEnd = `                </View>

                {/* Informações Adicionais */}`;

const startIndex = content.indexOf(targetStart);
const endIndex = content.indexOf(targetEnd);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `                  {/* Foto do Veículo GRANDE */}
                  {docUpdateStatus !== 'Aprovado' ? (
                     <View style={{ backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8, marginTop: 10 }}>
                       <Text style={{ color: '#6B7280', fontSize: 13, textAlign: 'center' }}>Desbloqueie a edição de documentos abaixo para alterar a foto do veículo.</Text>
                     </View>
                  ) : (
                    <ImageUpload
                      title="Foto do Veículo"
                      image={vehicleImage}
                      onPickImage={() => pickImage(setVehicleImage)}
                      onTakePhoto={() => takePhoto(setVehicleImage)}
                    />
                  )}
`;

  const finalContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  fs.writeFileSync(filepath, finalContent);
  console.log('Foto do veiculo block replaced successfully');
} else {
  console.log('Could not find Foto do veiculo target sections in EditProfileScreen.tsx');
}
