(function ($) {
  $.fn.dataTable.ext.errMode = "none";

  let socket = new WebSocket("ws://localhost:8080/ws");

  socket.onopen = function (e) {
    console.log("[open] Connection established");
    console.log("Sending to server");
    socket.send("Client connected from WEB: ", e);
  };

  const tableElements = {};

  function renderTableFromDataArray(
    dataId,
    data,
    forceRedraw = false,
    rowClickCb = null
  ) {
    {
      if (tableElements[dataId]) {
        if (forceRedraw) {
          $(tableElements[dataId]).remove();
        } else {
          return;
        }
      }

      const tabItem = {
        handle: $(`<li class="nav-link active">
                    <a href="#tab-${dataId}" role="tab" data-toggle="tab">
                      <span>${dataId}</span></span>
                    </a>
                  </li>`),
        content: $(`<div class="tab-pane active" id="tab-${dataId}">
                <div id="json-table-${dataId}" class="json-table-a margin-bottom"></div>
                <code id="json-code-${dataId}">N\\A</code>
              </div>`),
        dataTable: $(
          `<table id="${dataId}" class="table table-striped table-bordered" style="width:100%" />`
        ),
      };

      $("#tab-list", document).append(tabItem.handle);
      $("#tab-content", document).append(tabItem.content);
      $(`#json-table-${dataId}`, tabItem.content).append(tabItem.dataTable);
      tabItem.handle.siblings().removeClass("active");
      tabItem.content.siblings().removeClass("active");

      tableElements[dataId] = tabItem;

      let foundColumns = [];
      const TABLE_DATA = data.reduce(
        (current, item) => {
          if (!current.columns.length) {
            foundColumns = Object.keys(item);
            current.columns = foundColumns.map((key) => ({
              data: key,
              name: key,
              title: key,
            }));
          }

          const newItem = Object.keys(item).reduce((c, i) => {
            if (typeof c[i] === "object") c[i] = JSON.stringify(c[i]);
            if (!foundColumns.includes(i)) {
              foundColumns.push(i);
              current.columns.push({
                data: i,
                name: i,
                title: i,
              });
            }
            return c;
          }, item);

          current.data.push(newItem);
          return current;
        },
        { columns: [], data: [] }
      );

      const table = tabItem.dataTable.DataTable({
        scrollX: true,
        scrollY: true,
        select: {
          toggleable: false,
        },
        data: TABLE_DATA.data.map((item) => {
          for (const column of TABLE_DATA.columns) {
            if (!(column.name in item)) {
              item[column.name] = "N/A";
            }
          }
          return item;
        }),
        columns: TABLE_DATA.columns,
      });

      if (typeof rowClickCb === "function") {
        tabItem.dataTable.on("select.dt", rowClickCb);
      }
    }
  }

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

      if (data) {
        const dataKeys = Object.keys(data);
        for (const key of dataKeys) {
          switch (key) {
            case "matchlist":
              if (data[key].match && data[key].match.length > 0) {
                renderTableFromDataArray(
                  key,
                  data[key].match,
                  false,
                  function (e, dt, type, indexes) {
                    var data = dt.rows(indexes).data();
                    console.log(data);
                  }
                );
              }
              break;
            default:
              console.log("Unspecified key: ", key);
          }
        }

        if (Object.keys(tableElements).length > 0) {
          $("#content", document).removeClass("loading");
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
      console.log("[close] Connection died");
    }
  };

  socket.onerror = function (error) {
    console.log(`[error] ${error.message}`);
  };
})(jQuery || window.jQuery);
