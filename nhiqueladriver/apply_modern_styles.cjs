const fs = require('fs');

const filepath = 'src/screens/EditProfileScreen.tsx';
let content = fs.readFileSync(filepath, 'utf8').replace(/\r\n/g, '\n');

const startIndex = content.indexOf('const styles = StyleSheet.create({');
const endIndex = content.lastIndexOf('});') + 3;

if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
  const newStyles = `const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 40, // Assuming SafeArea context
    backgroundColor: "#FFF",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 8,
  },
  backButton: {
    padding: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: 0.5,
  },
  headerPlaceholder: {
    width: 44,
  },
  form: {
    padding: 16,
  },
  section: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#1E293B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: "row",
    gap: 16,
  },
  flex1: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#F8FAFC",
    color: "#0F172A",
  },
  readOnlyInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#F1F5F9",
  },
  readOnlyText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: '500',
  },
  readOnlyNote: {
    fontSize: 12,
    color: "#94A3B8",
    fontStyle: "italic",
    marginTop: 6,
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  required: {
    color: "#EF4444",
  },
  imageRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  imageColumn: {
    flex: 1,
  },
  imageUploadContainer: {
    marginBottom: 24,
  },
  imageUploadTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 10,
  },
  largeImageContainer: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  largePreviewImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
  },
  imageWithActions: {
    position: "relative",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    padding: 12,
    opacity: 0,
  },
  actionButton: {
    padding: 10,
    marginLeft: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  noImageLargeContainer: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
  },
  imagePlaceholder: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: '500',
    textAlign: "center",
    marginTop: 12,
  },
  imageActionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  imageActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: '#F3F0FF',
    borderRadius: 12,
    gap: 8,
  },
  imageActionButtonText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  radioGroup: {
    flexDirection: "row",
    gap: 20,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#FFF',
  },
  radioCircleSelected: {
    borderColor: COLORS.primary,
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  radioText: {
    fontSize: 14,
    fontWeight: '600',
    color: "#334155",
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: 16,
    marginTop: 12,
    marginBottom: 90,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cancelButton: {
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    elevation: 0,
    shadowOpacity: 0,
  },
  cancelButtonText: {
    color: "#64748B",
    fontWeight: "700",
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.5,
  }
});`;

  content = content.substring(0, startIndex) + newStyles + content.substring(endIndex);
  fs.writeFileSync(filepath, content);
  console.log('Premium styles applied successfully.');
} else {
  console.log('Could not find StyleSheet.create');
}
