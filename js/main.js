/* Toggle between adding and removing the "responsive" class to topnav when the user clicks on the icon */
function topNavOverflow() {
    var topNav = document.getElementById("topNav");
    if (topNav.className === "top-nav") {
      topNav.className += " responsive";
    } else {
      topNav.className = "top-nav";
    }
  }