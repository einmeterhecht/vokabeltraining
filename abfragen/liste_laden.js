
// https://stackoverflow.com/a/16699153
function get_url_parameter(name) {
    name = RegExp ('[?&]' + name.replace (/([[\]])/, '\\$1') + '=([^&#]*)');
    return (window.location.href.match (name) || ['', ''])[1];
}

// https://stackoverflow.com/a/14786759
function load_script(path) {
    var js = document.createElement("script");
    js.type = "text/javascript";
    js.src = path;
    document.body.appendChild(js);
    // Script is loaded asynchronously -> won't be available immediately
}
function liste_laden() {
    var sprach_ordner = get_url_parameter("folder");
    var filename = get_url_parameter("file");
    console.log("sprach_ordner: ", sprach_ordner);
    console.log("filename: ", filename);

    load_script("listen/" + sprach_ordner + "/" + filename + ".js");
}