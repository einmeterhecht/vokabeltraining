console.log("abfragen_js.js started");

var aufgabe_index = 0;
var beantwortet = false;

var enter_pressed = false;

var aufgaben = [];

var knacknuesse = [];
var nicht_sofort_klar = [];
var erledigte = [];

var MAX_UNTIL_KNACKNUSS = 2;
var REPEAT_INTERVAL = 5;
var KNACKNUSS_CHECK_INTERVAL = 14;
var frage_attribut;

function fortschritt_laden() {
	let learned = base64url_to_booleans(get_url_parameter("progress"));
	for (i in learned) {
		if (learned[i]) erledigte.push(i);
	}
}

function initialisiere_aufgabenliste () {
	for (i in liste.fragen){
	    if (erledigte.indexOf(i) == -1) aufgaben.push(i);
	}
    aufgaben = shuffle_array(aufgaben);
}

function shuffle_array(list){
	// Using Fisher-Yates algorithm:
	// https://bost.ocks.org/mike/shuffle/
	shuffled = [];
	// Create copy
	for (i in list){
		shuffled.push(list[i]);
	}
	
	remaining_elements = shuffled.length;
	
	while (remaining_elements != 0) {
		// Pick a remaining element...
		random_index = Math.floor(Math.random() * remaining_elements);
		remaining_elements--;
		// And swap it with the current element.
		random_element = shuffled[random_index];
		shuffled[random_index] = shuffled[remaining_elements];
		shuffled[remaining_elements] = random_element;
    }
	return shuffled;
}

function count_occurrences(list, item){
	count = 0;
	for (i in list){
		if (list[i] == item){
			count++;
		}
	}
	return count;
}

function remove_spaces_at_end(string) {
	while (string.endsWith(" ")){
        string = string.substring(0, string.length - 1);
	}
	return string;
}

function remove_content_in_brackets(string) {
	index = string.indexOf("(");
	while (index != -1) {
		until_bracket = string.substring(0, index);
		index_of_closing_bracket = string.indexOf(")", index);
		if (index_of_closing_bracket == -1) return string; // Bracket not closed
		after_bracket = string.substring(index_of_closing_bracket + 1, string.length);
		string = until_bracket + after_bracket;
		if (index == string.length) return string; // End of string
		index = string.indexOf("(", index);
	}
	return string;
}

const base64urlchars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function booleans_to_base64url(booleans) {
	while (booleans.length % 6 !== 0) booleans.push(false);
	let str = "";
	for (let i = 0; i < booleans.length; i += 6) {
		let char_index = 0;
	    for (let j = 5; j >= 0; j--) {
            char_index += booleans[i + j] ? 2 ** j : 0;
	    }
		str += base64urlchars[char_index]
    }
	return str;
}

function base64url_to_booleans(base64url) {
	booleans = [];
	for (const char of base64url) {
		char_index = base64urlchars.indexOf(char);
		for (let j = 5; j >= 0; j--) {
			booleans.push((char_index & (1 << j)) != 0);
		}
	}
	return booleans;
}

function get_frage(){
	return liste.fragen[aufgaben[aufgabe_index]];
}

function erste_aufgabe(){
	aufgabe_index = 0;
	beantwortet = false;
	frage_attribut = decodeURIComponent(get_url_parameter("askwith", liste.frage_attribut));
	console.log(get_url_parameter("askwith", liste.frage_attribut), decodeURIComponent(get_url_parameter("askwith", liste.frage_attribut)));
	//gefragtes_attribut = get_url_parameter("askfor", get_gefragtes_attribut());
	fortschritt_laden();
	initialisiere_aufgabenliste();
	frage_laden();
	update_progress();
	eingabe.focus(); // Cursor ins Eingabefeld setzen
}

function get_gefragte(){
	gefragte = [];
	for (key in get_frage()){
		if (key != frage_attribut){
			gefragte.push(key);
		}
	}
	return gefragte;
}

function get_gefragtes_attribut(frage = get_frage()){
	for (key in frage){
		if (key != frage_attribut){
	        return key;
		}
	}
	return "NotFound";
}

function get_gefragtes(frage = get_frage()){
	return String(frage[get_gefragtes_attribut(frage)][0]);
}

function frage_laden(){
	hinweis = "";
	if (get_gefragtes().startsWith("un ") ||
	    get_gefragtes().startsWith("une ")){
		hinweis = " (un/une)";
	}
	else if (get_gefragtes().startsWith("le ") ||
	         get_gefragtes().startsWith("la ") ||
	         get_gefragtes().startsWith("les ")||
	         get_gefragtes().startsWith("l'")){
		hinweis = " (le/la/l'/les)";
	}
	document.getElementById("fragestellung").innerHTML = frage_attribut
	+ ": "
	+ get_frage()[frage_attribut]
	+ hinweis;
	document.getElementById("eingabeaufforderung").innerHTML = get_gefragtes_attribut() + ":";
	eingabe.style.background = "#EEEECC";
	eingabe.value = "";
	beantwortet = false;
}

function update_progress(){
	progress.max = liste.fragen.length;
	progress.value = liste.fragen.length + aufgabe_index - aufgaben.length;
	progress_text.innerHTML = String(progress.value) + " / " + String(progress.max)
	
}

function eingabefeld_onkeyup(){
	if (enter_pressed) enter_pressed = false;
	else if (beantwortet){
		pruefe_eingabe();
	}
	else if (count_occurrences(eingabe.value, " ") > count_occurrences(get_gefragtes(), " ")){
		pruefe_eingabe();
	}
}

function antwort_anpassen(antwort){
	return remove_spaces_at_end(antwort).replaceAll("jemand","jmd") // Deutsch
		.replaceAll("jemanden","jmd")
		.replaceAll("jemandem","jmd")
		.replaceAll("jmd.","jmd")
		.replaceAll("jnd.","jmd")
		.replaceAll("etwas","etw")
		.replaceAll("\u00df","ss")
		.replaceAll("sb.","sb") // English
		.replaceAll("somebody","sb")
		.replaceAll("sb's","sbs")
		.replaceAll("sth.","sth")
		.replaceAll("something","sth")
		.replaceAll("qn.","qn") // Franzoesisch
		.replaceAll("qc.","qc")
		.replaceAll("gen.","gen") // Latein
		.replaceAll("genitiv","gen")
		.replaceAll("dat.","dat")
		.replaceAll("dativ","dat")
		.replaceAll("akk.","akk")
		.replaceAll("akkusativ","akk")
		.replaceAll("abl.","abl")
		.replaceAll("ablativ","abl")
		.replaceAll("\u0101","a")
		.replaceAll("\u0113","e")
		.replaceAll("\u012b","i")
		.replaceAll("\u014d","o")
		.replaceAll("\u016b","u")
		/*.replaceAll("\u0100","A")
		.replaceAll("\u0102","A")
		.replaceAll("\u0103","a")
		.replaceAll("\u0112","E")
		.replaceAll("\u0114","E")
		.replaceAll("\u0115","e")
		.replaceAll("\u012a","I")
		.replaceAll("\u012c","I")
		.replaceAll("\u012d","i")
		.replaceAll("\u014c","O")
		.replaceAll("\u014e","O")
		.replaceAll("\u014f","o")
		.replaceAll("\u016a","U")
		.replaceAll("\u016c","U")
		.replaceAll("\u016d","u")*/
		.replaceAll("…","...")
		/*.replaceAll(";","/") // Trennzeichen
		.replaceAll(",","/")
		.replaceAll(" /","/")
		.replaceAll("/ ","/")*/
		.replaceAll(","," ")   // Trennzeichen ignorieren
		.replaceAll(";"," ")
		.replaceAll("/"," ")
		.replaceAll("  "," ") // Leerschlag reicht
		.replaceAll("  "," ")
		.replaceAll("„","'")
		.replaceAll("“","'")
		.replaceAll("\"","'")
		.replaceAll("`","'")
		.replaceAll("‘","'");
}

function input_correct(input=eingabe.value){
	loesung = antwort_anpassen(get_gefragtes(get_frage()));
	gegebene_antwort = antwort_anpassen(input);
	if (loesung.replaceAll("(","").replaceAll(")","") == 
	gegebene_antwort.replaceAll("(","").replaceAll(")","")) {
		return true;
	}
	else if (remove_spaces_at_end(
	remove_content_in_brackets(loesung).replaceAll("  ", " ")) == gegebene_antwort) {
		return true;
	}
	return false;
}

function submit_eingabe(){
	if (!enter_pressed){
		enter_pressed = true;
		eingabe.value += " ";
		pruefe_eingabe();
	}
	return false;
}

function pruefe_eingabe(){
	if (beantwortet) {
		if (eingabe.selectionStart > 0) {
			char_entered = eingabe.value[eingabe.selectionStart - 1];
			if (char_entered == "<" || char_entered == ">" || char_entered == "a") {
				// "Antwort war richtig"
				check_for_knacknuss();
				naechste_frage();
			}
			else if (char_entered == " ") {
				// Naechste Frage
				wiederholen();
				naechste_frage();
			}
		    return;
			// Andere Tasten werden ignoriert (Enter wird woanders gefangen)
		}
	}

	beantwortet = true;
	eingabe.value = remove_spaces_at_end(eingabe.value);
	
	
	if (input_correct()){
		eingabe.style.background = "#006604"; // Original AbfrageApp - Farbe
		document.getElementById("eingabeaufforderung").innerHTML = "Richtig!";
		
		check_for_knacknuss();
		naechste_frage();
	}
	else{
		eingabe.style.background = "#990000";
		document.getElementById("eingabeaufforderung").innerHTML = "Falsch. Richtig wäre: " + get_gefragtes(get_frage());
		
		eingabe.value = eingabe.value + " ";
	    eingabe.selectionStart = eingabe.selectionEnd = eingabe.value.length; // Set cursor to end
	}
}

function check_for_knacknuss() {
	aufgabe = aufgaben[aufgabe_index];
	if (count_occurrences(aufgaben, aufgabe) > MAX_UNTIL_KNACKNUSS && knacknuesse.indexOf(aufgabe) == -1){
		// Needed at least 3 attempts
		aufgaben.splice(aufgabe_index + KNACKNUSS_CHECK_INTERVAL + 1, 0, aufgabe);
		knacknuesse.push(aufgabe);
	}
	else erledigte.push(aufgabe);
}

function wiederholen(){
	aufgabe = aufgaben[aufgabe_index];
	aufgaben.splice(aufgabe_index + REPEAT_INTERVAL + 1, 0, aufgabe);
	if (knacknuesse.indexOf(aufgabe) != -1){
		knacknuesse.splice(knacknuesse.indexOf(aufgabe), 1);
		// Repetition of difficult word
	}
	if (nicht_sofort_klar.indexOf(liste.fragen[aufgabe]) == -1){
		nicht_sofort_klar.push(liste.fragen[aufgabe]);
	}
}

function naechste_frage() {
	aufgabe_index++;
	update_progress();
	if (aufgabe_index >= aufgaben.length){
		fertig();
	}
	else{
		frage_laden();
	}
}

function get_knacknuesse(){
	knacknuesse_string = "";
	for (i in knacknuesse){
		knacknuesse_string += get_gefragtes(liste.fragen[knacknuesse[i]]) + "<br>";
	}
	return knacknuesse_string.substring(0, knacknuesse_string.length - 4);
}

function get_knacknuesse_json(){
	knacknuesse_json = {
    "fragen": nicht_sofort_klar,
	"hinweis_attribute": liste.hinweis_attribute,
    "titel": "schwierige_" + liste.titel,
    "frage_attribut": frage_attribut
    };
	//for (i in knacknuesse){
	//	knacknuesse_json.fragen.push(liste.fragen[knacknuesse[i]]);
	//}
	return JSON.stringify(knacknuesse_json);
}

function download(filename, contained_string) {
    element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(contained_string));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();
}

function fertig(){
	frage_attribut.innerHTML = "<b>FERTIG! " + String(liste.fragen.length) + " Wörter gelernt!</b>";
	if (knacknuesse.length == 0){
		document.getElementById("eingabeaufforderung").innerHTML = "Diese W\u00f6rter sitzen.";
		
		download_schwierige_button.hidden = false;
		progress.hidden = true;
	}
	else if (knacknuesse.length == 1){
		document.getElementById("eingabeaufforderung").innerHTML = "Gut gemacht.<br>Nur <i>" + get_knacknuesse() + "</i> war knifflig.";
		
		download_schwierige_button.hidden = false;
		progress.hidden = true;
	}
	else{
		document.getElementById("eingabeaufforderung").innerHTML = "Geschafft!<br>" +
		Math.round(100 * (1 - (knacknuesse.length / liste.fragen.length))) + "% sitzen.<br>" +
		"Schwierig waren diese " + knacknuesse.length + ":<br>" +
		"<i>" + get_knacknuesse() + "</i>";

		//download_schwierige_button.hidden = false;
		progress.hidden = true;
	}
	eingabe.remove();
	
}

function download_nicht_sofort_gewusste(){
	download('schwierige.js', "var liste = " + get_knacknuesse_json() + "; erste_aufgabe();");
}

function remove_parameter_from_url(parameter, url=window.location.href) {
    return url.replace(RegExp("&" + parameter +"=[\\w\\-\\_\\%]+"), "");
}

function get_url_with_parameter(parameter, value, url=window.location.href) {
	return remove_parameter_from_url(parameter, url) + "&" + parameter + "=" + value;
}

function fortschritt_kopieren() {
	navigator.clipboard.writeText(get_fortschritt_url());
}

function get_fortschritt_url() {
	let learned = [];
	for (i in liste.fragen) {
		learned.push(erledigte.indexOf(i) != -1);
	}
	return get_url_with_parameter("progress", booleans_to_base64url(learned));
}

function frage_attribut_tauschen_moeglich() {	
    let neues_frage_attribut = get_gefragtes_attribut();
	for (frage of liste.fragen) {
		if (!frage[neues_frage_attribut]) return false;
	}
	return true;
}

function frage_attribut_tauschen() {
	if (!frage_attribut_tauschen_moeglich()) return; // Currently not an issue
    window.location.href = get_url_with_parameter(
		"askwith",
		encodeURIComponent(get_gefragtes_attribut()),
		remove_parameter_from_url("progress"));
}
