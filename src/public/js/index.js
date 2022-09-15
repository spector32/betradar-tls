(function ($) {
  $.fn.dataTable.ext.errMode = "none";

  let socket = new WebSocket("ws://localhost:8080/ws");

  socket.onopen = function (e) {
    console.log("[open] Connection established");
    console.log("Waiting for response...");
    socket.send("session:start");
    socket.send("Client connected");

    setTimeout(() => {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams) {
        const matchId = searchParams.get("matchId");
        if (matchId && matchId.trim()) {
          console.log("Subscribtion request sent");
          socket.send("subscribe_match:" + matchId);
        }
      }
    }, 1000);
  };

  // ŠEIT NĀK MESSAGES NO SOKETA
  socket.onmessage = function (event) {
    if (event.data) {
      let data;
      try {
        data = JSON.parse(event.data);
        console.log("data: ", data);
      } catch (e) {
        console.log("Could not parse data");
        console.log(e.message);
      }

      // data mainīgais satur JSON objektu ar datiem
      if (data) {
        // MOST IMPORTANT
        const dataKeys = Object.keys(data);
        for (const key of dataKeys) {
          const normalized = data[key];
          switch (key) {
            case "matchlist":
              //
              break;
            case "match":
              if (normalized.feedtype === "delta") return;

              const matchtime = normalized.matchtime;

              const homeName = normalized.t1name;
              const guestsName = normalized.t2name;

              const setsHome = normalized.score[0].t1;
              const pointsHome = normalized.score[1].t1;
              const setsGuests = normalized.score[0].t2;
              const pointsGuests = normalized.score[1].t2;

              let arrayCount = normalized.score.length - 1;

              const firstSetGuests = normalized.score[arrayCount].t2;
              const firstSetHome = normalized.score[arrayCount].t1;

              $("#t1name").html(homeName);
              $("#t2name").html(guestsName);

              $("#TIME").html(matchtime);
              $("#1stHome").html(firstSetHome);
              $("#setsHome").html(setsHome);
              $("#pointsHome").html(pointsHome);

              $("#1stGuests").html(firstSetGuests);
              $("#setsGuests").html(setsGuests);
              $("#pointsGuests").html(pointsGuests);

              break;
            case "matchstop":
              if (normalized.reason) {
                console.error(normalized.reason);
              } else {
                console.error("Can't access match");
              }
              break;
            case "matchdata":
              //
              break;
            default:
              console.log("Unspecified key: ", key);
          }
        }
      }
    }
  };

  socket.onclose = function (event) {
    if (event.wasClean) {
      console.log(
        `[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`
      );
    } else {
      // e.g. server process killed or network down
      // event.code is usually 1006 in this case
      console.log("[close] Connection closed");
    }
  };

  socket.onerror = function (error) {
    console.log(`[error] ${error.message}`);
  };
})(jQuery || window.jQuery);
