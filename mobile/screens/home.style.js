import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
    textStyle: {
        fontFamily: "bold",
        fontSize: 40
    },
    appBarWrapper: {
        marginHorizontal: 22,
        marginTop: 10,

    },
    appBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",

    },
    location: {
        fontSize: 15,
        textAlign: 'center',
        fontWeight: "500"
    },
    locationView: {
        flexDirection: "row",
        // // justifyContent: "space-between",
        alignItems: "center",
        paddingLeft: '12%'
    },
    cartCount: {
        position: "absolute",
        bottom: 16,
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: "center",
        backgroundColor: '#7F00FF',
        justifyContent: 'center',
        zIndex: 999,

    },
    cartNumber: {
        fontWeight: '600',
        fontSize: 10,
        color: 'white',

    },
    cover: {
        width: 40,
        height: 40,
        borderRadius: 120,

    }
})


export default styles