import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
textStyle:{
    fontFamily: "bold",
    fontSize: 40
},
appBarWrapper:{
        marginHorizontal: 22,
        marginTop: 12
},
appBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
},
location:{
    fontSize: 15
},
cartCount: {
    position: "absolute",
    bottom: 16,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#3e2465",
    justifyContent: 'center',
    zIndex: 999
},
cartNumber: {
    fontWeight: '600',
    fontSize: 10,
    color: 'white'
}
})


export default styles