import os
import re

path = r'd:\Projectos\Nhiquela\nhiquelaweb\src\screens\admin\DriversScreen.jsx'
with open(path, 'rb') as f:
    content = f.read()

# Just decode as ISO-8859-1
text = content.decode('iso-8859-1')

# Replace garbled texts
text = re.sub(r'Dispon.vel', 'Disponível', text)
text = re.sub(r'Valida..o', 'Validação', text)
text = re.sub(r'Aprova..o', 'Aprovação', text)
text = re.sub(r'Matr.cula', 'Matrícula', text)
text = re.sub(r'Condu..o', 'Condução', text)
text = re.sub(r'Localiza..o', 'Localização', text)
text = re.sub(r'Ve.culo', 'Veículo', text)

# Add getImageUrl
img_helper = """
const getImageUrl = (path) => {
  if (!path) return '';
  const normalizedPath = path.replace(/\\\\/g, '/');
  if (normalizedPath.startsWith('http') || normalizedPath.startsWith('data:image')) return normalizedPath;
  const baseUrl = SOCKET_URL.endsWith('/') ? SOCKET_URL.slice(0, -1) : SOCKET_URL;
  return normalizedPath.startsWith('/') ? `${baseUrl}${normalizedPath}` : `${baseUrl}/${normalizedPath}`;
};
"""

text = text.replace("import api, { SOCKET_URL } from '../../api';", "import api, { SOCKET_URL } from '../../api';\n" + img_helper)

# Fix img src
old_img = """<img src={(selectedDriver.deliveryman?.photo || selectedDriver.photo).startsWith('http') ? (selectedDriver.deliveryman?.photo || selectedDriver.photo) : `${SOCKET_URL}${selectedDriver.deliveryman?.photo || selectedDriver.photo}`} alt="Selfie" className="w-100 h-100 object-fit-cover" />"""
new_img = """<img src={getImageUrl(selectedDriver.deliveryman?.photo || selectedDriver.photo)} alt="Selfie" className="w-100 h-100 object-fit-cover" />"""
text = text.replace(old_img, new_img)

# Fix onClick
old_click = """onClick={() => setSelectedImage(selectedDriver.deliveryman[doc.key].startsWith('http') ? selectedDriver.deliveryman[doc.key] : `${SOCKET_URL}${selectedDriver.deliveryman[doc.key]}`)}"""
new_click = """onClick={() => setSelectedImage(getImageUrl(selectedDriver.deliveryman[doc.key]))}"""
text = text.replace(old_click, new_click)

# The badge logic is:
# driver.status === 'Disponível' ? 'bg-success' : ... 'bg-danger'
# The replacement should not be needed if 'Disponível' evaluates to true now, because the string 'bg-success' is already mapped.

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print('Success!')
