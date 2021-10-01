function admin_remove(id)
{
    $.get( "/admin/api/admin_revoke/" + id + "/", function( result )
    {
        location.reload();
    });
}
function admin_add(id)
{
    $.get( "/admin/api/admin_add/" + id + "/", function( result )
    {
        location.reload();
    });
}
function admin_add2()
{
    $.get( "/admin/api/admin_add/" + $('#txtId').val() + "/", function( result )
    {
        location.reload();
    });
}
