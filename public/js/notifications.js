var DBActions = [];
function notification_save() {
    var data = {
        id: $('#txtId').val(),
        title: $('#txtTitle').val(),
        message: $('#txtMessage').val(),
        type: $('#txtType').val(),
        active: $('#txtActive').is(":checked"),
        coins: $('#txtCoins').val(),
        tokens: $('#txtTokens').val(),
        tickets: $('#txtTickets').val(),
        pushTitle: $('#txtPushTitle').val().trim(),
        pushBody: $('#txtPushBody').val().trim(),
        //receiversIds: JSON.stringify(receivers)
    };

    var receivers = [];//["5a86f180b450821102f8ea0f", "5a84354c71527309fed8aa21"];
    var actions = [];
    //document.getElementsByName("user_select");
    if (data.type == 'custom' || data.type == 'template_custom') {
        $("input[name='user_select']:checked").each(function () {
            receivers.push($(this).val());
        });
        // $("input[name='action_select']:checked").each(function () {
        //     actions.push($(this).val());
        // });

    }

    data.receiversIds = JSON.stringify(receivers);
    //data.actionsIds = JSON.stringify(actions);
    // if(selected_players.length > 0) {
    data.actionsIds = $('#txtActions').val();
    console.log(data);

    if (data.type == 'template_custom') {
        delete data.id;
        var tmp = $("#txtBeginAt").val();//06/27/2018 5:02 PM

        //var day = moment(tmp, "MM/DD/YYYY hh:MM TT");
        var day = moment(tmp, "MM/DD/YYYY hh:mm A");
        //var day = moment("06/27/2018 5:39 PM", "MM/DD/YYYY hh:MM TT");
        console.log(day);
        var date = day.toDate();
        console.log(date);

        data.beginAt = JSON.stringify({month:date.getMonth(),
                        day:date.getDate(),
                        year:date.getFullYear(),
                        hours:date.getHours(),
                        minutes:date.getMinutes(),

        });
        //console.log(data);

        $.post("/admin/api/notification/create_custom/", data, function (result) {
            location.reload();
        });

    }
    else
        $.post("/admin/notification/" + $('#txtId').val() + "/", data, function (result) {
            location.reload();
        });
}

function actions_select(){
    var actions = [];
    var coins   = 0;
    var tokens  = 0;
    var tickets = 0;
    $("input[name='action_select']:checked").each(function () {
        actions.push($(this).val());
    });
    $("#txtActions").val(JSON.stringify(actions));
    if(actions.length > 0){
        $("#selected_count").text("Selected: "+actions.length);
        if(DBActions.length > 0){
            for(var i=0; i < actions.length; i++){
                var index = DBActions.map(function(e) { return e._id; }).indexOf(actions[i]);
                if(index !=-1){
                    coins += DBActions[index].coins;
                    tokens += DBActions[index].tokens;
                    tickets += DBActions[index].tickets;
                }
            }
            $("#txtCoins").val(coins);
            $("#txtTokens").val(tokens);
            $("#txtTickets").val(tickets);
        }
    }
    else  $("#selected_count").text("");

}
function notification_remove() {
    $.ajax({
        url: "/admin/api/notification/" + $('#txtId').val(),
        type: 'DELETE',
        success: function (result) {
            location.reload();
        }
    });
}

function get_users() {

    $.ajax({
        url: "/admin/users/get/",
        type: 'GET',
        success: function (result) {
            var users = JSON.parse($('#txtReceivers').val());
            var table = $('#data_users').DataTable();
            table.rows().remove().draw();
            if(result.users == null || result.users === undefined) {
                $.ajax({
                    url: " /logout",
                    type: 'GET',
                    success: function (result) {
                        location.reload();
                    }
                });

            }
            else {
                for (var i = 0; i < result.users.length; i++) {
                    var danger = result.users[i].question_ids.length >= result.questions_count;
                    var selected = '';
                    if (users.length > 0) {
                        selected = users.indexOf(result.users[i]._id) != -1 ? 'checked' : '';
                    }

                    var rowNode = table
                        .row.add([
                            '<input type="checkbox" name="user_select" value=' + result.users[i]._id + ' id="user_select" ' + selected + '>',
                            i + 1,
                            result.users[i].first_name + " " + result.users[i].last_name,
                            result.users[i].user_name,
                            result.users[i].createdAt.replace(/T/, ' ').replace(/\..+/, ''),
                            result.users[i].lastLoginAt.replace(/T/, ' ').replace(/\..+/, ''),
                            result.users[i].tokens,
                            result.users[i].tickets,
                            result.users[i].coins,
                            result.users[i].question_ids.length.toString() + "/" + result.questions_count

                        ])
                        .draw()
                        .node();

                    if (danger)
                        $(rowNode).addClass('danger');

                }
                if ($('#txtType').val() == 'custom') {
                    $('#send_custom').hide();

                }
                else {
                    $('#send_custom').show();

                    if ($("input[name='user_select']:checked").length > 0)
                        $('#send_custom').prop('disabled', false);
                    else
                        $('#send_custom').prop('disabled', true);

                    $("input[name='user_select'],#user_select_all").change(function () {
                        if ($("input[name='user_select']:checked").length > 0)
                            $('#send_custom').prop('disabled', false);
                        else
                            $('#send_custom').prop('disabled', true);
                    });
                }

            }

        }
    });
}
function get_actions() {

    $.ajax({
        url: "/admin/lottery_actions/get",
        type: 'GET',
        success: function (result) {
            var actions = JSON.parse($('#txtActions').val());
            var table = $('#data_actions').DataTable();
            table.rows().remove().draw();
            console.log(result);
            DBActions = result.actions;
            for (var i = 0; i < result.actions.length; i++) {
                // var danger = result.actions[i].question_ids.length >= result.questions_count;
                 var selected = '';

                    $("#action_select_all").prop("checked",false);
                if(actions.length > 0){
                    selected = actions.indexOf(result.actions[i]._id)!=-1 ? 'checked' :'';
                }

                var rowNode = table
                    .row.add([
                        '<input type="checkbox" name="action_select" value=' + result.actions[i]._id + ' id="action_select" '+selected+'>',
                        i+1,
                        result.actions[i].title,
                        result.actions[i].coins,
                        result.actions[i].tokens,
                        result.actions[i].tickets,

                    ])
                    .draw()
                    .node();

                // if (danger)
                //     $(rowNode).addClass('danger');

            }
            if($('#txtType').val()=='custom')
            {
                $('#select_action_total').hide();

            }
            else{
                $('#select_action_total').show();

            }



        }
    });
}


function select_all(source) {
    checkboxes = document.getElementsByName('user_select');
    for (var i = 0; i < checkboxes.length; i++) {
        checkboxes[i].checked = source.checked;
    }

}

function select_all_actions(source) {
    checkboxes = document.getElementsByName('action_select');
    for (var i = 0; i < checkboxes.length; i++) {
        checkboxes[i].checked = source.checked;
    }

}