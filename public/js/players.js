function player_save()
{
    var data = {
        fi: $('#txtBalance').val(),
        first_name: $('#txtFirstName').val(),
        last_name: $('#txtLastName').val(),
        //tickets: $('#txtTickets').val(),
        coins: $('#txtCoins').val(),
        tokens: $('#txtTokens').val(),
        email: $('#txtEmail').val(),
        phone: $('#txtPhone').val(),
        date_of_birth: $('#txtDateBirth').val(),
        sex: $('#txtSex').val(),
        address: $('#txtAddress').val(),
        city: $('#txtCity').val(),
        state: $('#txtState').val(),
        zip: $('#txtZip').val(),

    };

    $.post( "/admin/api/users/" + $('#txtId').val() + "/", data, function( result )
    {
        location.reload();
    });
}


function player_remove()
{
    $.ajax({
        url:  "/admin/api/users/" + $('#txtId').val(),
        type: 'DELETE',
        success: function(result)
        {
            location.reload();
        }
    });
}

function remove_players()
{
    var selected_players =[];
    var data = {};
    data.ids = [];
    //document.getElementsByName("user_select");
    $("input[name='user_select']:checked").each(function(){
        selected_players.push($(this).val());
        data.ids.push ($(this).val());
    });
    console.log(selected_players);
   // if(selected_players.length > 0) {



        console.log(data);
        $.post( "/admin/api/remove/users/", data, function( result )
        {
            location.reload();
         });
   // }
}

function select_all(source) {
    checkboxes = document.getElementsByName('user_select');
    for(var i = 0;i < checkboxes.length; i++)
    {
        checkboxes[i].checked = source.checked;
    }
      
  }
