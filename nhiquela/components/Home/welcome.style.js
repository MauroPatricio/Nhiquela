import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
    outerContainer: {
        paddingHorizontal: 20,
        marginTop: 15,
        marginBottom: 15,
    },
    titleContainer: {
        marginBottom: 16,
    },
    brandText: {
        fontSize: 32,
        fontWeight: "800",
        color: "#7F00FF",
        letterSpacing: -0.5,
    },
    subtitleText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#6B7280",
        letterSpacing: 1.5,
        marginTop: 2,
        textTransform: "uppercase",
    },
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F3F4F6", // Cinza muito suave premium
        borderRadius: 16,
        flex: 1,
        height: 52,
        paddingHorizontal: 16,
        marginRight: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    searchIcon: {
        color: "#6B7280",
        marginRight: 8,
    },
    searchWrapper: {
        flex: 1,
    },
    searchInput: {
        fontSize: 15,
        color: "#1F2937",
        fontWeight: "500",
        height: "100%",
        width: "100%",
    },
    filterBtn: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: "#7F00FF",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#7F00FF",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 5,
    }
});

export default styles;