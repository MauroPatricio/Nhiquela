const fs = require('fs');
const file = 'd:\\Projectos\\Nhiquela\\nhiqueladriver\\src\\screens\\HomeScreen.tsx';
let content = fs.readFileSync(file, 'utf8');
const regex = /newTripModalOverlay: {[\s\S]*?newTripModalTitle: {[\s\S]*?},/g;
const replacement = \headsUpContainer: {
    position: 'absolute',
    top: 60,
    left: '5%',
    right: '5%',
    width: '90%',
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    padding: 16,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 25,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headsUpTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
  },\;
content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
