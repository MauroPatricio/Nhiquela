import os
import re

path = r'd:\Projectos\Nhiquela\nhiquelaweb\src\screens\admin\DriversScreen.jsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace any weird variants of Disponível
text = re.sub(r"Dispon[A-Za-z\-\x80-\xFF]+vel", "Disponível", text)
text = re.sub(r"Valida[A-Za-z\-\x80-\xFF]+o", "Validação", text)
text = re.sub(r"Aprova[A-Za-z\-\x80-\xFF]+o", "Aprovação", text)
text = re.sub(r"Matr[A-Za-z\-\x80-\xFF]+cula", "Matrícula", text)
text = re.sub(r"Condu[A-Za-z\-\x80-\xFF]+o", "Condução", text)
text = re.sub(r"Localiza[A-Za-z\-\x80-\xFF]+o", "Localização", text)
text = re.sub(r"Ve[A-Za-z\-\x80-\xFF]+culo", "Veículo", text)

# Just in case some were still ISO-8859-1
text = re.sub(r"Dispon.vel", "Disponível", text)

# For Rejeitado background color:
# selectedDriver.status === 'Rejeitado' ? 'bg-danger'
# The old one might be just: selectedDriver.status === 'Pendente' ? 'bg-warning text-dark' : 'bg-danger'
# Let's do a more robust replace for the badge classes
text = re.sub(r"(\(driver\.status \|\| 'Pendente'\) === 'Disponível' \? 'bg-success' : \(driver\.status \|\| 'Pendente'\) === 'Em Entrega' \? 'bg-info' : \(driver\.status \|\| 'Pendente'\) === 'Pendente' \? 'bg-warning text-dark') : 'bg-danger'", r"\1 : (driver.status || 'Pendente') === 'Rejeitado' ? 'bg-danger' : 'bg-secondary'", text)

text = re.sub(r"(selectedDriver\.status === 'Disponível' \? 'bg-success' : selectedDriver\.status === 'Pendente' \? 'bg-warning text-dark') : 'bg-danger'", r"\1 : selectedDriver.status === 'Rejeitado' ? 'bg-danger' : 'bg-secondary'", text)

text = re.sub(r"(selectedDriver\.status === 'Em Entrega' \? 'bg-info') : 'bg-danger'", r"\1 : selectedDriver.status === 'Rejeitado' ? 'bg-danger' : 'bg-secondary'", text)


with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print('Success!')
