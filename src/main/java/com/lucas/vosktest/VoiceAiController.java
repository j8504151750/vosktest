package com.lucas.vosktest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;

import javax.sound.sampled.UnsupportedAudioFileException;
import java.io.File;
import java.io.IOException;
import java.util.Date;


@Controller
public class VoiceAiController {

    @Autowired
    VoiceUtil voiceUtil;

    @RequestMapping("/")
    public String index() {
        return "redirect:/home.html";
    }

    @PostMapping("/getWord")
    @ResponseBody
    public ResponseEntity<String> getWord(MultipartFile file) {
        String path = "D:\\vosk\\" + new Date().getTime() + ".wav";
        File localFile = new File(path);
        try {
            file.transferTo(localFile);
            String text = voiceUtil.getWord(path);
            localFile.delete();
            return ResponseEntity.ok(text);
        } catch (IOException | UnsupportedAudioFileException e) {
            e.printStackTrace();
            localFile.delete();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("上傳失敗");
        }
    }

}