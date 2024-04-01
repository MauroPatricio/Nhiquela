import { StyleSheet } from "react-native";
 import { COLORS, SIZES } from "../../constants";

const styles = StyleSheet.create({
container: {
    width: "100%"
},
welcomeText:(color,size, top)=>({
    fontWeight: 'bold',
    fontSize: size,
    marginTop: top,
    marginHorizontal:12,
    color: color
}),
searchContainer:{
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: 10,
    marginVertical: 9,
    marginTop: 21
},
searchIcon:{
    marginHorizontal: 10,
    color: "black",
    marginTop: 5
},
searchWrapper:{
    flex: 1,
    backgroundColor: "white",
    marginRight: 5,
    borderRadius: 2
},
searchInput: {
// width: "100%",
paddingHorizontal: 12,
marginTop: 2
},
searchBtn:{
    width: 50,
    // height: "100%",
    borderRadius: 12,
     alignItems: "center",
     marginTop: 5
}

})

export default styles;