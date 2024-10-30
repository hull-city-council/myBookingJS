// myBookings Granicus Script ##
// by Hull City Council
// ##
// v1.0.0
// ##
// #############################

import { makeRequest } from "./makeRequest.js";
import "./iframeResizer.min.js";


let eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
let eventer = window[eventMethod];
let messageEvent = eventMethod === "attachEvent" ? "onmessage" : "message";
let bookableSlots;
let slotsSent = false;
let changeSelectedSlot = false;
let confirmationLoaded = false;
let iframe = document.querySelector("#iframe");
let availabilityLoaded = false;

const formatDate = new Intl.DateTimeFormat("gb", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// Get booking range
const bookableStartDate =
  typeof document.querySelector("#startDateChar").value !== "undefined" &&
  document.querySelector("#startDateChar").value !== null
    ? document.querySelector("#startDateChar").value
    : formatDate.format(Date.now()).toString();
const bookableEndDate =
  typeof document.querySelector("#endDateChar").value !== "undefined" &&
  document.querySelector("#endDateChar").value !== null
    ? document.querySelector("#endDateChar").value
    : formatDate
        .format(new Date(new Date().setDate(new Date().getDate() + 30)))
        .toString();
// Get resource ID
let resourceID =
  typeof document.querySelector("#resourceID").value !== "undefined" &&
  document.querySelector("#resourceID").value !== null
    ? document.querySelector("#resourceID").value
    : 0;
const dateSelected =
  typeof document.querySelector("#dateSelected").value !== "undefined" &&
  document.querySelector("#dateSelected").value !== null
    ? document.querySelector("#dateSelected").value
    : 0;
const slotSelectedStartTime =
  typeof document.querySelector("#slotSelectedStartTime").value !== "undefined" &&
  document.querySelector("#slotSelectedStartTime").value !== null
    ? document.querySelector("#slotSelectedStartTime").value
    : 0;
const slotSelectedEndTime =
  typeof document.querySelector("#slotSelectedEndTime").value !== "undefined" &&
  document.querySelector("#slotSelectedEndTime").value !== null
    ? document.querySelector("#slotSelectedEndTime").value
    : 0;
const ucrn =
  typeof document.querySelector("#formData").value !== "undefined" &&
  document.querySelector("#formData").value !== null
    ? JSON.parse(document.querySelector("#formData").value)[0].ucrn
    : 0;
const caseRef =
  typeof JSON.parse(document.querySelector("#formData").value)[0].case_ref !== "undefined" &&
  JSON.parse(document.querySelector("#formData").value)[0].case_ref !== null
    ? JSON.parse(document.querySelector("#formData").value)[0].case_ref
    : 0;
// Check if there is a previous stage
const previousTask =
  typeof parent.window.AF._iframe?.forms["fillform-frame-1"].data.task_data
    ?.previous_task_id !== "undefined"
    ? parent.window.AF._iframe.forms["fillform-frame-1"].data.task_data
        .previous_task_id
    : null;

  // Set the script as ready
    //TODO
    // if (e.origin !== 'http://the-trusted-iframe-origin.com') return;
    iframe.contentWindow.postMessage({
      isReady: true,
      }, "*");

  const resourceIDInput = document.querySelector("#resourceID");

  resourceIDInput.addEventListener("change", function() {
    resourceID = resourceIDInput.value;
    setTimeout(() => {
      console.log("detected resource id change");
      console.log("Delayed for 5 second.");
      iframe = document.querySelector("#iframe");
      getAvailability(bookableStartDate, bookableEndDate, resourceID);
    }, 5000);
  
  });

  // Get the resource availability for the date range
  function getAvailability(bookableStartDate, bookableEndDate, resourceID) {
    // Resize the iFrame
    iFrameResize({}, iframe);
    const postData = {
      formValues: {
        Section1: {
          endDateChar: {
            type: "text",
            value: bookableEndDate,
          },
          resourceID: {
            type: "text",
            value: resourceID,
          },
          startDateChar: {
            type: "text",
            value: bookableStartDate,
          },
        },
      },
    };
    // Now using SharePoint
    makeRequest({
      url:
        "/apibroker/runLookup?id=6685363a84f49&repeat_against=&noRetry=true&getOnlyTokens=undefined&log_id=&app_name=AchieveForms&sid=" +
        sid,
      body: postData,
      method: "POST",
    })
      .then((response) => {
        console.log("Response", response.integration.transformed.rows_data[0]);
        bookableSlots = JSON.parse(
          response.integration.transformed.rows_data[0]?.response,
        );
        if (
          typeof bookableSlots !== "undefined" &&
          bookableSlots !== null &&
          !slotsSent
        ) {
          console.log("sending availibility...", bookableSlots);
          //TODO
          // if (e.origin !== 'http://the-trusted-iframe-origin.com') return;
          iframe.contentWindow.postMessage(
            {
              slotAvailability: bookableSlots,
              minDate: bookableStartDate,
              maxDate: bookableEndDate,
            },
            "*",
          );
          slotsSent = true;
          availabilityLoaded = true;
        }
      })
      .then(() => {
        slotsSent = false;
        if (!previousTask?.length > 0) {
          checkForExistingBookings();
        }
      })
      .catch((error) => {
        console.error("Error", error);
      });
  }

  // Get the slots that are available for the selected date
  function getSlots(dateSelected, resourceID) {
    //TODO
    // if (e.origin !== 'http://the-trusted-iframe-origin.com') return;
    iframe.contentWindow.postMessage({ isLoading: true }, "*");
    const postData = {  
      formValues: {
        Section1: {
          dateSelected: {
            type: "text",
            value: dateSelected,
          },
          resourceID: {
            type: "text",
            value: resourceID,
          },
        },
      },
    };
    // Updated to SharePoint (Was 6615238c962ee)
    makeRequest({
      url:
        "/apibroker/runLookup?id=66bf58741398e&repeat_against=&noRetry=true&getOnlyTokens=undefined&log_id=&app_name=AchieveForms&sid=" +
        sid,
      body: postData,
      method: "POST",
    })
      .then((response) => {
        let slots = JSON.parse(
          response.integration.transformed.rows_data[0].response,
        );

        // TODO - else statement
        if (slots.slotData.length > 0) {
          //TODO
          // if (e.origin !== 'http://the-trusted-iframe-origin.com') return;
          iframe.contentWindow.postMessage({ slots: slots }, "*");
          iframe.contentWindow.postMessage({ isLoading: false }, "*");
        }
      })
      .catch((error) => {
        console.error("Error", error);
      });
  }

  function checkForExistingBookings() {
    const postData = {
      formValues: {
        Section1: {
          CustomerUCRN: {
            type: "text",
            value: ucrn,
          },
          resourceID: {
            type: "text",
            value: resourceID,
          },
        },
      },
    };

    makeRequest({
      url:
        "/apibroker/runLookup?id=66ec06e2b4931&repeat_against=&noRetry=true&getOnlyTokens=undefined&log_id=&app_name=AchieveForms&sid=" +
        sid,
      body: postData,
      method: "POST",
    })
      .then((response) => {
        
        let userBookings = null;

        if (response.integration.transformed.rows_data[0].userBookings !== "") {
          try {
            userBookings = JSON.parse(
              response.integration.transformed.rows_data[0].userBookings
            );
          } catch (error) {
            console.error("Error parsing userBookings:", error);
          }
        }
        
        // TODO - else statement
        if (userBookings?.length > 0) {
          //TODO
          // if (e.origin !== 'http://the-trusted-iframe-origin.com') return;
          iframe.contentWindow.postMessage({
            showAlert: true,
            bookingRef: userBookings
          }, "*");
          slotsSent = false;
          getSlots(dateSelected, resourceID);
        }
      })
      .catch((error) => {
        console.error("Error", error);
      });
  }

  // Send the data to the iFrame
  eventer(messageEvent, function (event) {
    // We are on stage 1, get the availability once the iFrame is ready
    if (
      typeof event.data.isReady !== "undefined" &&
      event.data.isReady !== null &&
      event.data.isReady === true &&
      availabilityLoaded === false &&
      (previousTask === null || (previousTask !== null && changeSelectedSlot))
    ) {
      getAvailability(bookableStartDate, bookableEndDate, resourceID);
    }
    if (
      typeof event.data.dateSelected !== "undefined" &&
      event.data.dateSelected !== null
    ) {
      // Set the date selected
      document.querySelector("#dateSelected").value = event.data.dateSelected;
      // Get the available slots
      getSlots(event.data.dateSelected, resourceID);
    }
    if (
      typeof event.data.requestChange !== "undefined" &&
      event.data.requestChange === true
    ) {
    
      // We need to change the appointment remove the saved booking
      const postData = {
        formValues: {
          Section1: {
            slotSelectedStartTime: {
              type: "text",
              value:  event.data.removeSlot.startTime,
            },
            slotSelectedEndTime: {
              type: "text",
              value: event.data.removeSlot.endTime,
            },
            resourceID: {
              type: "text",
              value: resourceID,
            },
            CustomerUCRN: {
              type: "text",
              value: ucrn,
            },
            case_ref: {
              type: "text",
              value: caseRef,
            },
          },
        },
      };
    
      makeRequest({
        url:
          "/apibroker/runLookup?id=6674437b23288&repeat_against=&noRetry=true&getOnlyTokens=undefined&log_id=&app_name=AchieveForms&sid=" +
          sid,
        body: postData,
        method: "POST",
      })
        .then((response) => {
          // Clear the slot selected
          $("#slotSelectedStartTime").val("").trigger("input");
          $("#slotSelectedEndTime").val("").trigger("input");
          document.querySelector("#concurrentSlots").value = "";
          document.querySelector("#dateSelected").value = "";
          getAvailability(bookableStartDate, bookableEndDate, resourceID);
        })
        .catch((error) => {
          console.error("Error", error);
        });
    }
    if (
      typeof event.data.slotSelected !== "undefined" &&
      event.data.slotSelected !== null
    ) {
      // Set the slot selected
      event.data.slotSelected !== ""
        ? $("#slotSelectedStartTime").val(event.data.slotSelected.startTime ).trigger("input")
        : $("#slotSelectedStartTime").val("").trigger("input");
      event.data.slotSelected !== ""
        ? $("#slotSelectedEndTime").val(event.data.slotSelected.endTime).trigger("input")
        : $("#slotSelectedEndTime").val("").trigger("input");
      event.data.slotSelected !== ""
        ? document.querySelector("#concurrentSlots").value = event.data.slotSelected.concurrentSlots
        : document.querySelector("#concurrentSlots").value = "";

      const slotSelectedStartTime = document.querySelector("#slotSelectedStartTime").value,
      slotSelectedEndTime = document.querySelector("#slotSelectedEndTime").value,
      concurrentSlots = document.querySelector("#concurrentSlots").value;

      if(slotSelectedStartTime && slotSelectedEndTime !== "") {
        // Reserve appointment for 10 minutes
        const postData = {
          formValues: {
            Section1: {
              slotSelectedStartTime: {
                type: "text",
                value: slotSelectedStartTime,
              },
              slotSelectedEndTime: {
                type: "text",
                value: slotSelectedEndTime,
              },
              resourceID: {
                type: "text",
                value: resourceID,
              },
              concurrentSlots: {
                type: "text",
                value: concurrentSlots,
              },
              CustomerUCRN: {
                type: "text",
                value: ucrn,
              },
              caseRef: {
                type: "text",
                value: caseRef,
              },
            },
          },
        };

        makeRequest({
          url:
            "/apibroker/runLookup?id=66e408eaac529&repeat_against=&noRetry=true&getOnlyTokens=undefined&log_id=&app_name=AchieveForms&sid=" +
            sid,
          body: postData,
          method: "POST",
        })
          .then((response) => {
            if(response.status === "done")  {
              // Send the response once done
              console.log(response);
              let saveResponse = JSON.parse(
                response.integration.transformed.rows_data[0].result,
              );
              let queryResult = response.integration.transformed.rows_data[0].QueryResult;
              //TODO
              // if (e.origin !== 'http://the-trusted-iframe-origin.com') return;
              iframe.contentWindow.postMessage({
                saveResponse: saveResponse,
                queryResult: queryResult,
                }, "*");
                alert("We have reserved your booking for 10 minutes. Submit this form to confirm your booking.");
            }
          })
          .catch((error) => {
            console.error("Error", error);
          });
      }
    }

    // We are not on stage 1, load the confirmation page
    if (
      previousTask?.length > 0 &&
      !event.data.changeSlot &&
      changeSelectedSlot === false &&
      confirmationLoaded === false
    ) {
      let iframe =document.getElementsByTagName('iframe')[0];
      //TODO
      // if (e.origin !== 'http://the-trusted-iframe-origin.com') return;
      iframe.contentWindow.postMessage(
        {
          loadConfirmation: true,
          date: dateSelected,
          startTime: slotSelectedStartTime,
          endTime: slotSelectedEndTime,
        },
        "*",
      );
      confirmationLoaded = true;
      iFrameResize({}, iframe);
    }
    if (event.data.changeSlot) {
      changeSelectedSlot = true;
    }
  });
