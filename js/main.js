/* Toggle between adding and removing the "responsive" class to topnav when the user clicks on the icon */
function topNavOverflow() {
    let topNav = document.getElementById("topNav");
    if (topNav.className === "nav-items") {
      topNav.className += " responsive";
    } else {
      topNav.className = "nav-items";
    }
}

window.onmessage = (e) => {
    if (e.data.hasOwnProperty("frameHeight")) {
        document.getElementById("project_iframe").style.height = `${e.data.frameHeight + 30}px`;
    }
};

window.onresize = () => {
    console.log("onresize")
}