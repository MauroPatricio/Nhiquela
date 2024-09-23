import { StyleSheet } from "react-native";
import { COLORS, SIZES } from "../../constants";

const styles = StyleSheet.create({
    container: {
        width: "100%",
    },
    welcomeText: (color, size, top) => ({
        fontWeight: 'bold',
        fontSize: size,
        marginTop: top,
        marginHorizontal: 15,
        color: color,

    }),
    welcomeText2: (color, size, top) => ({
        fontSize: size,
        marginTop: top,
        marginHorizontal: 15,
        color: color,
        fontWeight: "700"
    }),
    searchContainer: {
        flexDirection: "row",
        justifyContent: "center",
        backgroundColor: "#E6E6FA",
        borderRadius: 112,
        marginVertical: 9,
        // marginTop: 21
        marginLeft: 12,
        marginRight: 12

    },
    searchIcon: {
        marginHorizontal: 10,
        color: "#4B0082",
        alignItems: "center",
        marginTop: 7,
        alignContent: "center"
    },
    searchWrapper: {
        flex: 1,
        backgroundColor: "#E6E6FA",
        marginRight: 5,
        borderRadius: 2,

    },
    searchInput: {
        // width: "100%",
        paddingHorizontal: 12,
        padding: 6,
        fontWeight: "500",

    },
    searchBtn: {
        width: 50,
        // height: "100%",
        borderRadius: 12,
        alignItems: "center",
        marginTop: 5,
        padding: 6,
    }

})

export default styles;