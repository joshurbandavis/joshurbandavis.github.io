<?php
$Name = $_POST['Name'];
$Email = $_POST['Email'];
$Phone = $_POST['phone'];
$Subject = $_POST['Subject'];
$Message = $_POST['Message'];
$formcontent=" From: $Name \n Subject: $Subject \n Message: $Message";
$recipient = "joshurbandavis@gmail.com";
$subject = "Contact Form";
$mailheader = "From: $Email \r\n";
mail($recipient, $Subject, $formcontent, $mailheader) or die("Error!");
echo "Thank You!";
?>