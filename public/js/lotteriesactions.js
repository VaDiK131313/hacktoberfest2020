function action_save() {
    var data = {
        id: $('#txtId').val(),
        title: $('#txtTitle').val(),
        coins: $('#txtCoins').val(),
        tokens: $('#txtTokens').val(),
        tickets: $('#txtTickets').val(),
        active: $('#txtActive').is(":checked"),

    };


    if ($("#txtId").val()=="0") {
        delete data.id;
        $.post("/admin/api/lottery_action/create", data, function (result) {
            location.reload();
        });

    }
    else
        $.post("/admin/lottery_action/" + $('#txtId').val() + "/", data, function (result) {
            location.reload();
        });
}


function action_remove() {
    $.ajax({
        url: "/admin/api/lottery_action/" + $('#txtId').val(),
        type: 'DELETE',
        success: function (result) {
            location.reload();
        }
    });
}

function action_remove_by_id(id){
    $.ajax({
        url: "/admin/api/lottery_action/" + id,
        type: 'DELETE',
        success: function (result) {
            location.reload();
        }
    });
}


function select_all(source) {
    checkboxes = document.getElementsByName('user_select');
    for (var i = 0; i < checkboxes.length; i++) {
        checkboxes[i].checked = source.checked;
    }

}